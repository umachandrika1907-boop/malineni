"""
EduSuccessAI - High-Volume Data Ingestion & Batch Seeding Engine
Supports:
  - CSV files (.csv)
  - Excel files (.xlsx, .xls)
  - JSON files (.json)
Handles high-throughput batching (10k - 70k+ records) with bulk inserts
and triggers automated score recalculation.
"""
import io
import json
import logging
from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional, Tuple
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import insert

from app.models.student import Student
from app.models.academic_record import AcademicRecord
from app.models.attendance_log import AttendanceLog
from app.models.lms_activity import LMSActivity
from app.models.engagement_activity import EngagementActivity
from app.models.csv_upload_log import CSVUploadLog
from app.services.scoring_service import ScoringService

logger = logging.getLogger(__name__)


class IngestionService:
    CHUNK_SIZE = 2500

    @classmethod
    def parse_file_to_dataframe(cls, file_bytes: bytes, filename: str) -> pd.DataFrame:
        """Parses raw uploaded bytes into a sanitized pandas DataFrame."""
        fname = filename.lower()
        if fname.endswith(".csv"):
            # Try utf-8, fallback to latin-1
            try:
                df = pd.read_csv(io.BytesIO(file_bytes), encoding="utf-8")
            except UnicodeDecodeError:
                df = pd.read_csv(io.BytesIO(file_bytes), encoding="latin-1")
        elif fname.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(file_bytes))
        elif fname.endswith(".json"):
            data = json.loads(file_bytes.decode("utf-8"))
            df = pd.DataFrame(data if isinstance(data, list) else [data])
        else:
            raise ValueError(f"Unsupported file format '{filename}'. Please upload CSV, Excel, or JSON.")

        # Clean column names (strip whitespace, lowercase, replace spaces with underscores)
        df.columns = [str(c).strip().lower().replace(" ", "_").replace("-", "_") for c in df.columns]
        return df

    @classmethod
    def detect_data_type(cls, df: pd.DataFrame, requested_type: Optional[str] = None) -> str:
        """Auto-detect data dimension based on column presence if not explicitly specified."""
        req = (requested_type or "").upper()
        if req in ("ACADEMIC", "ATTENDANCE", "LMS", "ENGAGEMENT", "STUDENTS", "COMPREHENSIVE"):
            return req

        cols = set(df.columns)
        if {"marks_obtained", "subject_code"}.issubset(cols) or {"gpa", "marks"}.intersection(cols):
            return "ACADEMIC"
        if {"attendance_status", "date"}.issubset(cols) or {"attended_classes", "total_classes"}.issubset(cols) or "attendance_pct" in cols:
            return "ATTENDANCE"
        if {"logins", "assignments_submitted"}.issubset(cols) or "course_name" in cols:
            return "LMS"
        if {"activity_type", "activity_name"}.issubset(cols):
            return "ENGAGEMENT"
        if {"full_name", "department", "program"}.issubset(cols):
            return "STUDENTS"
        if {"student_id", "attendance", "marks"}.intersection(cols):
            return "COMPREHENSIVE"

        return "COMPREHENSIVE"

    @classmethod
    def process_upload(
        cls,
        db: Session,
        file_bytes: bytes,
        filename: str,
        user_id: int,
        data_type: Optional[str] = "AUTO",
        semester_override: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Main entry point for batch file ingestion.
        Parses data, matches students, runs bulk insert chunks, logs audit record,
        and triggers scoring engine.
        """
        df = cls.parse_file_to_dataframe(file_bytes, filename)
        row_count = len(df)
        detected_type = cls.detect_data_type(df, data_type)

        # 1. Initialize Audit Log Record
        upload_log = CSVUploadLog(
            uploaded_by=user_id,
            data_type=detected_type,
            file_name=filename,
            row_count=row_count,
            status="PROCESSING",
        )
        db.add(upload_log)
        db.commit()
        db.refresh(upload_log)

        # 2. Pre-fetch student cache {student_id_str: id}
        student_map: Dict[str, int] = {
            s.student_id_str.strip().upper(): s.id
            for s in db.query(Student.student_id_str, Student.id).all()
        }

        imported_count = 0
        rejected_count = 0
        errors: List[Dict[str, Any]] = []
        affected_student_ids: set = set()

        try:
            if detected_type == "STUDENTS":
                imported_count, rejected_count, errors = cls._ingest_students(
                    db, df, student_map
                )
            elif detected_type == "ACADEMIC":
                imported_count, rejected_count, errors, affected_student_ids = cls._ingest_academics(
                    db, df, student_map, upload_log.id, semester_override
                )
            elif detected_type == "ATTENDANCE":
                imported_count, rejected_count, errors, affected_student_ids = cls._ingest_attendance(
                    db, df, student_map, upload_log.id, semester_override
                )
            elif detected_type == "LMS":
                imported_count, rejected_count, errors, affected_student_ids = cls._ingest_lms(
                    db, df, student_map, upload_log.id
                )
            elif detected_type == "ENGAGEMENT":
                imported_count, rejected_count, errors, affected_student_ids = cls._ingest_engagement(
                    db, df, student_map, upload_log.id, semester_override
                )
            else:
                # COMPREHENSIVE (Flat student rows with multi-dimension columns)
                imported_count, rejected_count, errors, affected_student_ids = cls._ingest_comprehensive(
                    db, df, student_map, upload_log.id, semester_override
                )

            # 3. Update Audit Log
            upload_log.rows_imported = imported_count
            upload_log.rows_rejected = rejected_count
            upload_log.status = "SUCCESS" if rejected_count == 0 else ("PARTIAL" if imported_count > 0 else "FAILED")
            upload_log.error_summary = json.dumps(errors[:100])
            upload_log.completed_at = datetime.utcnow()
            db.commit()

            # 4. Trigger Scoring Engine for all affected students
            scores_updated = 0
            for sid in affected_student_ids:
                try:
                    ScoringService.compute_student_score(db, sid)
                    scores_updated += 1
                except Exception as sc_err:
                    logger.warning(f"Error computing score for student {sid}: {sc_err}")

            return {
                "success": True,
                "batch_id": upload_log.id,
                "data_type": detected_type,
                "row_count": row_count,
                "rows_imported": imported_count,
                "rows_rejected": rejected_count,
                "scores_recomputed": scores_updated,
                "errors_sample": errors[:5],
            }

        except Exception as e:
            db.rollback()
            upload_log.status = "FAILED"
            upload_log.error_summary = json.dumps([{"error": str(e)}])
            upload_log.completed_at = datetime.utcnow()
            db.commit()
            raise e

    # -------------------------------------------------------------
    # Ingestion Dimension Handlers with High-Speed Batching
    # -------------------------------------------------------------

    @classmethod
    def _resolve_student_id(
        cls, db: Session, raw_id: Any, student_map: Dict[str, int], row_data: Optional[Dict] = None
    ) -> Optional[int]:
        """Resolves student database integer ID, auto-creating student record if needed."""
        if pd.isna(raw_id):
            return None
        sid_str = str(raw_id).strip().upper()
        if sid_str in student_map:
            return student_map[sid_str]

        # Auto-create stub student record so data isn't dropped
        name = (row_data.get("full_name") or row_data.get("name") or f"Student {sid_str}") if row_data else f"Student {sid_str}"
        dept = (row_data.get("department") or row_data.get("dept") or "Engineering") if row_data else "Engineering"
        prog = (row_data.get("program") or "B.Tech") if row_data else "B.Tech"
        email = (row_data.get("email") or f"{sid_str.lower()}@edusuccess.edu") if row_data else f"{sid_str.lower()}@edusuccess.edu"

        new_student = Student(
            student_id_str=sid_str,
            full_name=name,
            email=email,
            department=dept,
            program=prog,
            year_of_study=int(row_data.get("year_of_study", 1)) if row_data else 1,
            current_semester=int(row_data.get("semester", 1)) if row_data else 1,
            enrollment_date=date(2024, 8, 1),
            is_active=True,
        )
        db.add(new_student)
        db.flush()
        student_map[sid_str] = new_student.id
        return new_student.id

    @classmethod
    def _ingest_academics(
        cls, db: Session, df: pd.DataFrame, student_map: Dict[str, int], batch_id: int, sem_override: Optional[int]
    ) -> Tuple[int, int, List, set]:
        records_to_insert = []
        errors = []
        affected_ids = set()

        for idx, row in df.iterrows():
            try:
                sid_raw = row.get("student_id_str") or row.get("student_id")
                student_id = cls._resolve_student_id(db, sid_raw, student_map, row.to_dict())
                if not student_id:
                    errors.append({"row": idx + 2, "error": f"Missing or invalid student ID '{sid_raw}'"})
                    continue

                marks = float(row.get("marks_obtained") or row.get("marks") or row.get("score") or 0.0)
                max_m = float(row.get("max_marks") or 100.0)
                pct = round((marks / max_m * 100.0), 2) if max_m > 0 else 0.0

                grade = str(row.get("grade") or ("A" if pct >= 80 else ("B" if pct >= 65 else ("C" if pct >= 50 else "F"))))

                records_to_insert.append({
                    "student_id": student_id,
                    "subject_code": str(row.get("subject_code") or row.get("course_code") or "GEN101").strip().upper(),
                    "subject_name": str(row.get("subject_name") or row.get("course_name") or "General Course"),
                    "semester": int(sem_override or row.get("semester") or 1),
                    "academic_year": str(row.get("academic_year") or "2025-26"),
                    "marks_obtained": marks,
                    "max_marks": max_m,
                    "percentage": pct,
                    "grade": grade,
                    "is_superseded": False,
                    "upload_batch_id": batch_id,
                })
                affected_ids.add(student_id)
            except Exception as e:
                errors.append({"row": idx + 2, "error": str(e)})

        # Clean up existing records and deduplicate in-memory batch for matching student, subject, semester, and academic_year
        if records_to_insert:
            unique_records = {}
            for rec in records_to_insert:
                k = (rec["student_id"], rec["subject_code"], rec["semester"], rec["academic_year"])
                unique_records[k] = rec
            records_to_insert = list(unique_records.values())

            for rec in records_to_insert:
                db.query(AcademicRecord).filter(
                    AcademicRecord.student_id == rec["student_id"],
                    AcademicRecord.subject_code == rec["subject_code"],
                    AcademicRecord.semester == rec["semester"],
                    AcademicRecord.academic_year == rec["academic_year"],
                ).delete(synchronize_session=False)
            db.commit()

        # Execute in bulk chunks
        for i in range(0, len(records_to_insert), cls.CHUNK_SIZE):
            chunk = records_to_insert[i : i + cls.CHUNK_SIZE]
            db.bulk_insert_mappings(AcademicRecord, chunk)
            db.commit()

        return len(records_to_insert), len(errors), errors, affected_ids

    @classmethod
    def _ingest_attendance(
        cls, db: Session, df: pd.DataFrame, student_map: Dict[str, int], batch_id: int, sem_override: Optional[int]
    ) -> Tuple[int, int, List, set]:
        records_to_insert = []
        errors = []
        affected_ids = set()

        for idx, row in df.iterrows():
            try:
                sid_raw = row.get("student_id_str") or row.get("student_id")
                student_id = cls._resolve_student_id(db, sid_raw, student_map, row.to_dict())
                if not student_id:
                    errors.append({"row": idx + 2, "error": f"Invalid student ID '{sid_raw}'"})
                    continue

                raw_status = str(row.get("status") or row.get("attendance_status") or "P").strip().upper()
                status = "P" if raw_status in ("P", "PRESENT", "1", "TRUE") else ("A" if raw_status in ("A", "ABSENT", "0", "FALSE") else "L")

                raw_date = row.get("date") or row.get("attendance_date")
                parsed_date = pd.to_datetime(raw_date).date() if pd.notna(raw_date) else date.today()

                records_to_insert.append({
                    "student_id": student_id,
                    "subject_code": str(row.get("subject_code") or "GEN101").strip().upper(),
                    "date": parsed_date,
                    "semester": int(sem_override or row.get("semester") or 1),
                    "status": status,
                    "is_superseded": False,
                    "upload_batch_id": batch_id,
                })
                affected_ids.add(student_id)
            except Exception as e:
                errors.append({"row": idx + 2, "error": str(e)})

        # Clean up existing attendance records and deduplicate in-memory batch
        if records_to_insert:
            unique_records = {}
            for rec in records_to_insert:
                k = (rec["student_id"], rec["subject_code"], rec["date"])
                unique_records[k] = rec
            records_to_insert = list(unique_records.values())

            for rec in records_to_insert:
                db.query(AttendanceLog).filter(
                    AttendanceLog.student_id == rec["student_id"],
                    AttendanceLog.subject_code == rec["subject_code"],
                    AttendanceLog.date == rec["date"],
                ).delete(synchronize_session=False)
            db.commit()

        for i in range(0, len(records_to_insert), cls.CHUNK_SIZE):
            chunk = records_to_insert[i : i + cls.CHUNK_SIZE]
            db.bulk_insert_mappings(AttendanceLog, chunk)
            db.commit()

        return len(records_to_insert), len(errors), errors, affected_ids

    @classmethod
    def _ingest_lms(
        cls, db: Session, df: pd.DataFrame, student_map: Dict[str, int], batch_id: int
    ) -> Tuple[int, int, List, set]:
        records_to_insert = []
        errors = []
        affected_ids = set()

        for idx, row in df.iterrows():
            try:
                sid_raw = row.get("student_id_str") or row.get("student_id")
                student_id = cls._resolve_student_id(db, sid_raw, student_map, row.to_dict())
                if not student_id:
                    errors.append({"row": idx + 2, "error": f"Invalid student ID '{sid_raw}'"})
                    continue

                raw_date = row.get("week_start_date") or row.get("date")
                week_date = pd.to_datetime(raw_date).date() if pd.notna(raw_date) else date.today()

                records_to_insert.append({
                    "student_id": student_id,
                    "course_name": str(row.get("course_name") or "Core Curriculum"),
                    "week_start_date": week_date,
                    "logins": int(row.get("logins") or 0),
                    "assignments_submitted": int(row.get("assignments_submitted") or 0),
                    "assignments_total": int(row.get("assignments_total") or 1),
                    "videos_watched": int(row.get("videos_watched") or 0),
                    "forum_posts": int(row.get("forum_posts") or 0),
                    "quiz_attempts": int(row.get("quiz_attempts") or 0),
                    "is_superseded": False,
                    "upload_batch_id": batch_id,
                })
                affected_ids.add(student_id)
            except Exception as e:
                errors.append({"row": idx + 2, "error": str(e)})

        # Clean up existing LMS records and deduplicate in-memory batch
        if records_to_insert:
            unique_records = {}
            for rec in records_to_insert:
                k = (rec["student_id"], rec["course_name"], rec["week_start_date"])
                unique_records[k] = rec
            records_to_insert = list(unique_records.values())

            for rec in records_to_insert:
                db.query(LMSActivity).filter(
                    LMSActivity.student_id == rec["student_id"],
                    LMSActivity.course_name == rec["course_name"],
                    LMSActivity.week_start_date == rec["week_start_date"],
                ).delete(synchronize_session=False)
            db.commit()

        for i in range(0, len(records_to_insert), cls.CHUNK_SIZE):
            chunk = records_to_insert[i : i + cls.CHUNK_SIZE]
            db.bulk_insert_mappings(LMSActivity, chunk)
            db.commit()

        return len(records_to_insert), len(errors), errors, affected_ids

    @classmethod
    def _ingest_engagement(
        cls, db: Session, df: pd.DataFrame, student_map: Dict[str, int], batch_id: int, sem_override: Optional[int]
    ) -> Tuple[int, int, List, set]:
        records_to_insert = []
        errors = []
        affected_ids = set()

        for idx, row in df.iterrows():
            try:
                sid_raw = row.get("student_id_str") or row.get("student_id")
                student_id = cls._resolve_student_id(db, sid_raw, student_map, row.to_dict())
                if not student_id:
                    errors.append({"row": idx + 2, "error": f"Invalid student ID '{sid_raw}'"})
                    continue

                raw_date = row.get("activity_date") or row.get("date")
                act_date = pd.to_datetime(raw_date).date() if pd.notna(raw_date) else date.today()

                records_to_insert.append({
                    "student_id": student_id,
                    "activity_type": str(row.get("activity_type") or "CLUB").upper(),
                    "activity_name": str(row.get("activity_name") or "Campus Activity"),
                    "activity_date": act_date,
                    "semester": int(sem_override or row.get("semester") or 1),
                    "role": str(row.get("role") or "Participant"),
                    "upload_batch_id": batch_id,
                })
                affected_ids.add(student_id)
            except Exception as e:
                errors.append({"row": idx + 2, "error": str(e)})

        for i in range(0, len(records_to_insert), cls.CHUNK_SIZE):
            chunk = records_to_insert[i : i + cls.CHUNK_SIZE]
            db.bulk_insert_mappings(EngagementActivity, chunk)
            db.commit()

        return len(records_to_insert), len(errors), errors, affected_ids

    @classmethod
    def _ingest_students(
        cls, db: Session, df: pd.DataFrame, student_map: Dict[str, int]
    ) -> Tuple[int, int, List]:
        records = []
        errors = []

        for idx, row in df.iterrows():
            try:
                sid = str(row.get("student_id_str") or row.get("student_id")).strip().upper()
                if sid in student_map:
                    continue  # Already exists

                enroll = pd.to_datetime(row.get("enrollment_date")).date() if pd.notna(row.get("enrollment_date")) else date(2024, 8, 1)

                records.append({
                    "student_id_str": sid,
                    "full_name": str(row.get("full_name") or row.get("name") or f"Student {sid}"),
                    "email": str(row.get("email") or f"{sid.lower()}@edusuccess.edu"),
                    "phone": str(row.get("phone") or "") if pd.notna(row.get("phone")) else None,
                    "department": str(row.get("department") or row.get("dept") or "Engineering"),
                    "program": str(row.get("program") or "B.Tech"),
                    "year_of_study": int(row.get("year_of_study") or 1),
                    "current_semester": int(row.get("current_semester") or 1),
                    "enrollment_date": enroll,
                    "is_active": True,
                })
                student_map[sid] = -1  # Placeholder
            except Exception as e:
                errors.append({"row": idx + 2, "error": str(e)})

        for i in range(0, len(records), cls.CHUNK_SIZE):
            chunk = records[i : i + cls.CHUNK_SIZE]
            db.bulk_insert_mappings(Student, chunk)
            db.commit()

        # Refresh map with newly generated IDs
        for s in db.query(Student.student_id_str, Student.id).all():
            student_map[s.student_id_str] = s.id

        return len(records), len(errors), errors

    @classmethod
    def _ingest_comprehensive(
        cls, db: Session, df: pd.DataFrame, student_map: Dict[str, int], batch_id: int, sem_override: Optional[int]
    ) -> Tuple[int, int, List, set]:
        """
        Parses flat multi-metric student files (e.g., student_id, name, department, marks, attendance, logins).
        Decomposes flat row into Student, Academic, Attendance, and LMS records simultaneously.
        """
        affected_ids = set()
        errors = []
        imported_count = 0

        acad_records = []
        att_records = []
        lms_records = []

        today = date.today()

        for idx, row in df.iterrows():
            try:
                sid_raw = row.get("student_id_str") or row.get("student_id")
                student_id = cls._resolve_student_id(db, sid_raw, student_map, row.to_dict())
                if not student_id:
                    errors.append({"row": idx + 2, "error": f"Invalid student ID '{sid_raw}'"})
                    continue

                sem = int(sem_override or row.get("semester") or 1)

                # 1. Academic marks
                if any(k in row for k in ("marks", "marks_obtained", "gpa", "percentage")):
                    marks = float(row.get("marks_obtained") or row.get("marks") or 0.0)
                    if "gpa" in row and marks == 0:
                        marks = float(row.get("gpa") or 0.0) * 10.0  # 10.0 scale to 100
                    acad_records.append({
                        "student_id": student_id,
                        "subject_code": str(row.get("subject_code") or "CORE101").upper(),
                        "subject_name": str(row.get("subject_name") or "Core Program Course"),
                        "semester": sem,
                        "academic_year": "2025-26",
                        "marks_obtained": marks,
                        "max_marks": 100.0,
                        "percentage": min(100.0, marks),
                        "grade": "A" if marks >= 80 else ("B" if marks >= 65 else ("C" if marks >= 50 else "F")),
                        "is_superseded": False,
                        "upload_batch_id": batch_id,
                    })

                # 2. Attendance percentage (generate matching log entries if % given)
                if any(k in row for k in ("attendance", "attendance_pct", "attended_classes")):
                    att_pct = float(row.get("attendance_pct") or row.get("attendance") or 80.0)
                    total_days = 20
                    present_days = int(round((att_pct / 100.0) * total_days))
                    for d in range(total_days):
                        att_records.append({
                            "student_id": student_id,
                            "subject_code": "CORE101",
                            "date": today - timedelta(days=d),
                            "semester": sem,
                            "status": "P" if d < present_days else "A",
                            "is_superseded": False,
                            "upload_batch_id": batch_id,
                        })

                # 3. LMS Logins
                if any(k in row for k in ("logins", "lms_logins", "assignments")):
                    lms_records.append({
                        "student_id": student_id,
                        "course_name": "Core Program Course",
                        "week_start_date": today,
                        "logins": int(row.get("logins") or row.get("lms_logins") or 5),
                        "assignments_submitted": int(row.get("assignments_submitted") or 2),
                        "assignments_total": 2,
                        "videos_watched": int(row.get("videos_watched") or 3),
                        "forum_posts": int(row.get("forum_posts") or 1),
                        "quiz_attempts": int(row.get("quiz_attempts") or 1),
                        "is_superseded": False,
                        "upload_batch_id": batch_id,
                    })

                affected_ids.add(student_id)
                imported_count += 1
            except Exception as e:
                errors.append({"row": idx + 2, "error": str(e)})

        # Bulk insert decomposed dimensions with deduplication & collision prevention
        if acad_records:
            unique_acad = {}
            for rec in acad_records:
                k = (rec["student_id"], rec["subject_code"], rec["semester"], rec["academic_year"])
                unique_acad[k] = rec
            acad_records = list(unique_acad.values())

            for rec in acad_records:
                db.query(AcademicRecord).filter(
                    AcademicRecord.student_id == rec["student_id"],
                    AcademicRecord.subject_code == rec["subject_code"],
                    AcademicRecord.semester == rec["semester"],
                    AcademicRecord.academic_year == rec["academic_year"],
                ).delete(synchronize_session=False)
            db.commit()

            for i in range(0, len(acad_records), cls.CHUNK_SIZE):
                db.bulk_insert_mappings(AcademicRecord, acad_records[i : i + cls.CHUNK_SIZE])
            db.commit()

        if att_records:
            unique_att = {}
            for rec in att_records:
                k = (rec["student_id"], rec["subject_code"], rec["date"])
                unique_att[k] = rec
            att_records = list(unique_att.values())

            for rec in att_records:
                db.query(AttendanceLog).filter(
                    AttendanceLog.student_id == rec["student_id"],
                    AttendanceLog.subject_code == rec["subject_code"],
                    AttendanceLog.date == rec["date"],
                ).delete(synchronize_session=False)
            db.commit()

            for i in range(0, len(att_records), cls.CHUNK_SIZE):
                db.bulk_insert_mappings(AttendanceLog, att_records[i : i + cls.CHUNK_SIZE])
            db.commit()

        if lms_records:
            unique_lms = {}
            for rec in lms_records:
                k = (rec["student_id"], rec["course_name"], rec["week_start_date"])
                unique_lms[k] = rec
            lms_records = list(unique_lms.values())

            for rec in lms_records:
                db.query(LMSActivity).filter(
                    LMSActivity.student_id == rec["student_id"],
                    LMSActivity.course_name == rec["course_name"],
                    LMSActivity.week_start_date == rec["week_start_date"],
                ).delete(synchronize_session=False)
            db.commit()

            for i in range(0, len(lms_records), cls.CHUNK_SIZE):
                db.bulk_insert_mappings(LMSActivity, lms_records[i : i + cls.CHUNK_SIZE])
            db.commit()

        db.commit()
        return imported_count, len(errors), errors, affected_ids
