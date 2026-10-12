"""
EduSuccessAI - Deterministic Success & Risk Scoring Engine
Calculates normalized multi-dimensional composite student scores:
  Score = w_academic * Academic_Pct + w_attendance * Attendance_Pct + w_lms * LMS_Pct + w_engagement * Engagement_Pct

Risk Segmentation Bands:
  - SAFE: Score >= 80 and Attendance >= 80%
  - LOW_RISK: Score 70-79
  - MEDIUM_RISK: Score 55-69
  - HIGH_RISK: Score 40-54 or Attendance < 75%
  - CRITICAL: Score < 40 or Attendance < 60%
"""
import json
import logging
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.student import Student
from app.models.academic_record import AcademicRecord
from app.models.attendance_log import AttendanceLog
from app.models.lms_activity import LMSActivity
from app.models.engagement_activity import EngagementActivity
from app.models.skill_assessment import SkillAssessment
from app.models.placement_record import PlacementRecord
from app.models.success_score import SuccessScore
from app.models.score_weight_config import ScoreWeightConfig

logger = logging.getLogger(__name__)


class ScoringService:
    # Default weights per KPMG Campus Challenge architectural specification
    DEFAULT_WEIGHTS = {
        "academic": 0.40,
        "attendance": 0.30,
        "lms": 0.20,
        "engagement": 0.10,
        "skills": 0.00,
        "placement": 0.00,
    }

    @classmethod
    def get_active_weights(cls, db: Session) -> Dict[str, float]:
        """Fetch custom weights if configured in database, else defaults."""
        config = (
            db.query(ScoreWeightConfig)
            .filter(ScoreWeightConfig.is_active == True)
            .order_by(ScoreWeightConfig.created_at.desc())
            .first()
        )
        if config:
            return {
                "academic": config.academic_weight,
                "attendance": config.attendance_weight,
                "lms": config.lms_weight,
                "engagement": config.engagement_weight,
                "skills": config.skills_weight,
                "placement": config.placement_weight,
            }
        return cls.DEFAULT_WEIGHTS.copy()

    @classmethod
    def calculate_academic_sub_score(
        cls, db: Session, student_id: int, semester: Optional[int] = None
    ) -> Optional[float]:
        """Compute average percentage across academic records."""
        query = db.query(func.avg(AcademicRecord.percentage)).filter(
            AcademicRecord.student_id == student_id,
            AcademicRecord.is_superseded == False,
        )
        if semester:
            query = query.filter(AcademicRecord.semester == semester)
        result = query.scalar()
        return round(float(result), 2) if result is not None else None

    @classmethod
    def calculate_attendance_sub_score(
        cls, db: Session, student_id: int, semester: Optional[int] = None
    ) -> Optional[float]:
        """Compute attendance percentage = (Present / Total Classes) * 100."""
        query = db.query(AttendanceLog.status).filter(
            AttendanceLog.student_id == student_id,
            AttendanceLog.is_superseded == False,
        )
        if semester:
            query = query.filter(AttendanceLog.semester == semester)
        logs = query.all()
        if not logs:
            return None

        total_classes = len(logs)
        present_count = sum(1 for (status,) in logs if status in ("P", "Present"))
        return round((present_count / total_classes) * 100.0, 2)

    @classmethod
    def calculate_lms_sub_score(
        cls, db: Session, student_id: int
    ) -> Optional[float]:
        """
        Compute LMS engagement index (0-100) based on:
        - Assignment submission rate (50%)
        - Login frequency (25%, normalized to 10 logins/wk = 100%)
        - Video watch hours / forum posts (25%)
        """
        logs = (
            db.query(LMSActivity)
            .filter(
                LMSActivity.student_id == student_id,
                LMSActivity.is_superseded == False,
            )
            .all()
        )
        if not logs:
            return None

        total_assignments = sum(l.assignments_total for l in logs)
        submitted_assignments = sum(l.assignments_submitted for l in logs)
        sub_rate = (
            (submitted_assignments / total_assignments * 100.0)
            if total_assignments > 0
            else 80.0
        )

        avg_logins = sum(l.logins for l in logs) / len(logs)
        login_score = min(100.0, (avg_logins / 7.0) * 100.0)

        avg_videos = sum(l.videos_watched for l in logs) / len(logs)
        video_score = min(100.0, (avg_videos / 5.0) * 100.0)

        composite = (0.50 * sub_rate) + (0.30 * login_score) + (0.20 * video_score)
        return round(composite, 2)

    @classmethod
    def calculate_engagement_sub_score(
        cls, db: Session, student_id: int, semester: Optional[int] = None
    ) -> Optional[float]:
        """Compute extracurricular and club engagement points (capped at 100)."""
        query = db.query(EngagementActivity).filter(
            EngagementActivity.student_id == student_id
        )
        if semester:
            query = query.filter(EngagementActivity.semester == semester)
        activities = query.all()
        if not activities:
            return 50.0  # Baseline neutral engagement

        # 20 points per activity, bonus for leadership
        points = 0.0
        for act in activities:
            points += 25.0
            if act.role in ("Organizer", "Winner", "Lead", "President"):
                points += 15.0

        return min(100.0, round(points, 2))

    @classmethod
    def determine_risk_segment(
        cls, total_score: Optional[float], attendance_pct: Optional[float]
    ) -> Tuple[str, List[str], List[Dict[str, str]]]:
        """
        Apply deterministic business rules to assign risk band, explanation, and active flags.
        """
        flags: List[str] = []
        explanations: List[Dict[str, str]] = []

        if total_score is None:
            return "NO_DATA", ["MISSING_DATA"], [{"dimension": "all", "message": "No data available."}]

        # Check attendance deficits
        if attendance_pct is not None:
            if attendance_pct < 60.0:
                flags.append("CRITICAL_ATTENDANCE")
                explanations.append({
                    "dimension": "attendance",
                    "status": "CRITICAL",
                    "message": f"Attendance is {attendance_pct:.1f}%, far below the 75% institutional mandate.",
                })
            elif attendance_pct < 75.0:
                flags.append("LOW_ATTENDANCE")
                explanations.append({
                    "dimension": "attendance",
                    "status": "WEAK",
                    "message": f"Attendance is {attendance_pct:.1f}%, below the required 75% threshold.",
                })

        # Check score deficits
        if total_score < 40.0:
            flags.append("ACADEMIC_CRITICAL")
            explanations.append({
                "dimension": "academics",
                "status": "CRITICAL",
                "message": f"Composite score is {total_score:.1f}/100.",
            })
        elif total_score < 55.0:
            flags.append("ACADEMIC_DEFICIT")
            explanations.append({
                "dimension": "academics",
                "status": "WEAK",
                "message": f"Composite score is {total_score:.1f}/100, requiring active intervention.",
            })

        # Determine segment
        # CRITICAL: Score < 40 or Attendance < 60%
        if total_score < 40.0 or (attendance_pct is not None and attendance_pct < 60.0):
            segment = "CRITICAL"
        # HIGH_RISK: Score 40-54 or Attendance < 75%
        elif total_score < 55.0 or (attendance_pct is not None and attendance_pct < 75.0):
            segment = "HIGH_RISK"
        # MEDIUM_RISK: Score 55-69
        elif total_score < 70.0:
            segment = "MEDIUM_RISK"
        # LOW_RISK: Score 70-79
        elif total_score < 80.0:
            segment = "LOW_RISK"
        # SAFE: Score >= 80 and Attendance >= 80%
        elif attendance_pct is None or attendance_pct >= 80.0:
            segment = "SAFE"
        else:
            segment = "LOW_RISK"

        return segment, flags, explanations

    @classmethod
    def compute_student_score(
        cls,
        db: Session,
        student_id: int,
        semester: Optional[int] = None,
        academic_year: str = "2025-26",
    ) -> Optional[SuccessScore]:
        """Compute and persist success score snapshot for one student."""
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            return None

        sem = semester or student.current_semester or 1
        weights = cls.get_active_weights(db)

        # 1. Calculate dimension sub-scores
        acad_sub = cls.calculate_academic_sub_score(db, student_id, sem)
        att_sub = cls.calculate_attendance_sub_score(db, student_id, sem)
        lms_sub = cls.calculate_lms_sub_score(db, student_id)
        eng_sub = cls.calculate_engagement_sub_score(db, student_id, sem)

        # Count available dimensions
        available_dims = []
        if acad_sub is not None: available_dims.append(("academic", acad_sub, weights["academic"]))
        if att_sub is not None: available_dims.append(("attendance", att_sub, weights["attendance"]))
        if lms_sub is not None: available_dims.append(("lms", lms_sub, weights["lms"]))
        if eng_sub is not None: available_dims.append(("engagement", eng_sub, weights["engagement"]))

        if not available_dims:
            return None

        # Re-normalize weights if some dimensions are missing
        total_avail_weight = sum(w for _, _, w in available_dims)
        if total_avail_weight > 0:
            total_score = sum(val * (w / total_avail_weight) for _, val, w in available_dims)
            total_score = round(total_score, 2)
        else:
            total_score = None

        completeness = round((len(available_dims) / 4.0) * 100.0, 1)

        # 2. Risk band & Explainability
        segment, flags, explanations = cls.determine_risk_segment(total_score, att_sub)

        # 3. Rule-based recommendations
        recommendations = {
            "tutoring_required": segment in ("HIGH_RISK", "CRITICAL"),
            "priority_focus": "Attendance & Core Subjects" if (att_sub and att_sub < 75) else "Exam Preparation",
            "suggested_actions": [
                "Schedule peer tutoring consultation" if segment in ("HIGH_RISK", "CRITICAL") else "Maintain current study regimen",
                "Set 14-day attendance recovery target" if (att_sub and att_sub < 75) else "Engage with weekly LMS self-assessments",
            ],
        }

        # 4. Insert new SuccessScore snapshot
        score_record = SuccessScore(
            student_id=student_id,
            semester=sem,
            academic_year=academic_year,
            academic_sub_score=acad_sub,
            attendance_sub_score=att_sub,
            lms_sub_score=lms_sub,
            engagement_sub_score=eng_sub,
            academic_weight=weights["academic"],
            attendance_weight=weights["attendance"],
            lms_weight=weights["lms"],
            engagement_weight=weights["engagement"],
            total_score=total_score,
            risk_segment=segment,
            data_completeness_pct=completeness,
            explanation_json=json.dumps(explanations),
            active_flags=json.dumps(flags),
            recommendation_json=json.dumps(recommendations),
        )

        db.add(score_record)
        db.commit()
        db.refresh(score_record)
        return score_record

    @classmethod
    def recompute_all_scores(cls, db: Session) -> int:
        """Batch recompute scores for all active students."""
        students = db.query(Student.id).filter(Student.is_active == True).all()
        count = 0
        for (sid,) in students:
            try:
                cls.compute_student_score(db, sid)
                count += 1
            except Exception as e:
                logger.error(f"Error computing score for student ID {sid}: {e}")
        return count
