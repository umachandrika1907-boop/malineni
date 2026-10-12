"""
EduSuccessAI - High-Volume Synthetic Benchmark Data Generator
Generates realistic benchmark student records across:
  - Engineering (Computer Science, Mechanical, Electronics, Civil)
  - Management (MBA, BBA, Finance)
  - Science (Data Science, Biotechnology, Physics)

Supports generating 10,000 to 70,000+ benchmark student records with:
  - Academic records (Marks, Grades, Subject Codes)
  - Attendance logs (Present/Absent/Leave across daily logs)
  - LMS engagement metrics (Weekly logins, video watch hours, assignment submissions)
  - Extracurricular engagement activities (Clubs, Hackathons, Sports)
  - Pre-computed Success Scores & Risk bands (Safe, Low Risk, Medium Risk, High Risk, Critical)

Usage:
  python seed/generate_synthetic_benchmark.py --count 10000
  python seed/generate_synthetic_benchmark.py --count 10000 --export-csv sample_csvs/benchmark_10k_students.csv
"""
import sys
import os
import argparse
import random
import time
from datetime import date, timedelta
from faker import Faker
from sqlalchemy import func

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal, create_tables
from app.models.student import Student
from app.models.academic_record import AcademicRecord
from app.models.attendance_log import AttendanceLog
from app.models.lms_activity import LMSActivity
from app.models.engagement_activity import EngagementActivity
from app.models.success_score import SuccessScore
from app.services.scoring_service import ScoringService


fake = Faker("en_IN")
Faker.seed(42)
random.seed(42)

DEPARTMENTS = {
    "Computer Science": {"programs": ["B.Tech CSE", "M.Tech AI"], "prefix": "CS"},
    "Electronics": {"programs": ["B.Tech ECE"], "prefix": "EC"},
    "Mechanical": {"programs": ["B.Tech ME"], "prefix": "ME"},
    "Management": {"programs": ["MBA Tech", "BBA"], "prefix": "MG"},
    "Data Science": {"programs": ["B.Sc Data Science"], "prefix": "DS"},
}

COURSES_BY_DEPT = {
    "Computer Science": [("CS201", "Data Structures & Algorithms"), ("CS202", "Database Management"), ("CS203", "Operating Systems")],
    "Electronics": [("EC201", "Digital Signal Processing"), ("EC202", "Microcontrollers"), ("EC203", "Analog Circuits")],
    "Mechanical": [("ME201", "Thermodynamics"), ("ME202", "Fluid Mechanics"), ("ME203", "Machine Design")],
    "Management": [("MG201", "Financial Accounting"), ("MG202", "Marketing Management"), ("MG203", "Business Analytics")],
    "Data Science": [("DS201", "Statistical Inference"), ("DS202", "Machine Learning Fundamentals"), ("DS203", "Data Visualization")],
}


def generate_benchmark_data(count: int = 10000, export_csv_path: str = None, seed_database: bool = True):
    print("==================================================================")
    print(f"      EduSuccessAI Benchmark Generator: {count:,} Student Records")
    print("==================================================================")

    start_time = time.time()
    create_tables()
    db = SessionLocal()

    student_records = []
    academic_records = []
    attendance_records = []
    lms_records = []
    engagement_records = []
    csv_rows = []

    today = date.today()
    max_id = db.query(func.max(Student.id)).scalar() or 0

    print(f"[*] Generating {count:,} synthetic profiles across multi-dimensional metrics (offset ID: {max_id + 1})...")

    # Distribution profile:
    # 45% SAFE, 25% LOW_RISK, 15% MEDIUM_RISK, 10% HIGH_RISK, 5% CRITICAL
    profiles = (
        ["SAFE"] * 45
        + ["LOW_RISK"] * 25
        + ["MEDIUM_RISK"] * 15
        + ["HIGH_RISK"] * 10
        + ["CRITICAL"] * 5
    )

    for i in range(1, count + 1):
        target_profile = random.choice(profiles)
        dept_name = random.choice(list(DEPARTMENTS.keys()))
        dept_info = DEPARTMENTS[dept_name]
        program = random.choice(dept_info["programs"])
        student_pk = max_id + i
        student_id_str = f"24{dept_info['prefix']}{student_pk:05d}"
        full_name = fake.name()
        email = f"{student_id_str.lower()}@edusuccess.edu"

        year_of_study = random.choice([1, 2, 3, 4])
        semester = (year_of_study * 2) - random.choice([0, 1])

        # Dimension generation based on target profile
        if target_profile == "SAFE":
            marks_base = random.uniform(80.0, 96.0)
            att_rate = random.uniform(85.0, 98.0)
            logins_per_wk = random.randint(8, 18)
            assignment_pct = random.uniform(90.0, 100.0)
            num_activities = random.randint(2, 4)
        elif target_profile == "LOW_RISK":
            marks_base = random.uniform(70.0, 79.9)
            att_rate = random.uniform(76.0, 84.0)
            logins_per_wk = random.randint(6, 12)
            assignment_pct = random.uniform(80.0, 92.0)
            num_activities = random.randint(1, 2)
        elif target_profile == "MEDIUM_RISK":
            marks_base = random.uniform(55.0, 69.9)
            att_rate = random.uniform(75.0, 82.0)
            logins_per_wk = random.randint(4, 8)
            assignment_pct = random.uniform(65.0, 80.0)
            num_activities = random.randint(0, 2)
        elif target_profile == "HIGH_RISK":
            marks_base = random.uniform(42.0, 54.0)
            att_rate = random.uniform(62.0, 74.0)  # Attendance below 75%
            logins_per_wk = random.randint(2, 5)
            assignment_pct = random.uniform(45.0, 65.0)
            num_activities = random.randint(0, 1)
        else:  # CRITICAL
            marks_base = random.uniform(25.0, 39.0)
            att_rate = random.uniform(45.0, 59.0)  # Severe attendance violation
            logins_per_wk = random.randint(0, 3)
            assignment_pct = random.uniform(20.0, 45.0)
            num_activities = 0

        student_records.append({
            "id": student_pk,
            "student_id_str": student_id_str,
            "full_name": full_name,
            "email": email,
            "phone": fake.phone_number()[:15],
            "department": dept_name,
            "program": program,
            "year_of_study": year_of_study,
            "current_semester": semester,
            "enrollment_date": date(2024, 8, 1),
            "is_active": True,
        })

        # Academic course records
        courses = COURSES_BY_DEPT.get(dept_name, [("GEN101", "Core Course")])
        for code, cname in courses:
            course_mark = min(100.0, max(0.0, marks_base + random.uniform(-6.0, 6.0)))
            grade = "A" if course_mark >= 80 else ("B" if course_mark >= 65 else ("C" if course_mark >= 50 else "F"))
            academic_records.append({
                "student_id": student_pk,
                "subject_code": code,
                "subject_name": cname,
                "semester": semester,
                "academic_year": "2025-26",
                "marks_obtained": round(course_mark, 1),
                "max_marks": 100.0,
                "percentage": round(course_mark, 1),
                "grade": grade,
                "is_superseded": False,
            })

        # Attendance logs (10 sample sessions per student)
        num_sessions = 10
        present_sessions = int(round((att_rate / 100.0) * num_sessions))
        for d in range(num_sessions):
            attendance_records.append({
                "student_id": student_pk,
                "subject_code": courses[0][0],
                "date": today - timedelta(days=(num_sessions - d)),
                "semester": semester,
                "status": "P" if d < present_sessions else "A",
                "is_superseded": False,
            })

        # LMS Weekly record
        lms_records.append({
            "student_id": student_pk,
            "course_name": courses[0][1],
            "week_start_date": today - timedelta(days=7),
            "logins": logins_per_wk,
            "assignments_submitted": int(round((assignment_pct / 100.0) * 4)),
            "assignments_total": 4,
            "videos_watched": int(logins_per_wk * 0.75),
            "forum_posts": 2 if target_profile == "SAFE" else 0,
            "quiz_attempts": 2 if target_profile in ("SAFE", "LOW_RISK") else 1,
            "is_superseded": False,
        })

        # Engagement
        if num_activities > 0:
            for act_idx in range(num_activities):
                engagement_records.append({
                    "student_id": student_pk,
                    "activity_type": random.choice(["CLUB", "HACKATHON", "WORKSHOP", "SPORTS"]),
                    "activity_name": random.choice(["Coding Club", "Robotics League", "Campus Hack", "Debate Society"]),
                    "activity_date": today - timedelta(days=random.randint(10, 60)),
                    "semester": semester,
                    "role": "Lead" if target_profile == "SAFE" and act_idx == 0 else "Participant",
                })

        # For optional CSV export
        if export_csv_path:
            csv_rows.append({
                "student_id": student_id_str,
                "full_name": full_name,
                "department": dept_name,
                "program": program,
                "year": year_of_study,
                "semester": semester,
                "marks_obtained": round(marks_base, 1),
                "attendance_pct": round(att_rate, 1),
                "logins": logins_per_wk,
                "assignments_submitted": int(round((assignment_pct / 100.0) * 4)),
                "target_risk": target_profile,
            })

    # Optional CSV export
    if export_csv_path:
        import pandas as pd
        os.makedirs(os.path.dirname(os.path.abspath(export_csv_path)), exist_ok=True)
        pd.DataFrame(csv_rows).to_csv(export_csv_path, index=False)
        print(f"[+] Exported benchmark dataset to: {export_csv_path}")

    if not seed_database:
        return

    # Database bulk inserts in optimized chunks
    CHUNK = 2500
    print("[*] Committing student master records...")
    for c in range(0, len(student_records), CHUNK):
        db.bulk_insert_mappings(Student, student_records[c : c + CHUNK])
    db.commit()

    print("[*] Committing academic records...")
    for c in range(0, len(academic_records), CHUNK):
        db.bulk_insert_mappings(AcademicRecord, academic_records[c : c + CHUNK])
    db.commit()

    print("[*] Committing attendance logs...")
    for c in range(0, len(attendance_records), CHUNK):
        db.bulk_insert_mappings(AttendanceLog, attendance_records[c : c + CHUNK])
    db.commit()

    print("[*] Committing LMS activity logs...")
    for c in range(0, len(lms_records), CHUNK):
        db.bulk_insert_mappings(LMSActivity, lms_records[c : c + CHUNK])
    db.commit()

    if engagement_records:
        print("[*] Committing engagement activities...")
        for c in range(0, len(engagement_records), CHUNK):
            db.bulk_insert_mappings(EngagementActivity, engagement_records[c : c + CHUNK])
        db.commit()

    # Compute scores for all students
    print("[*] Computing deterministic composite scores and risk bands...")
    score_count = ScoringService.recompute_all_scores(db)
    elapsed = time.time() - start_time

    print("==================================================================")
    print(f"[+] BENCHMARK SEED COMPLETE: {count:,} students processed in {elapsed:.2f}s!")
    print(f"    - Success Scores Computed: {score_count:,}")
    print("==================================================================")
    db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate synthetic benchmark student dataset.")
    parser.add_argument("--count", type=int, default=10000, help="Number of student records to generate (default: 10000)")
    parser.add_argument("--export-csv", type=str, default=None, help="Path to export CSV benchmark file")
    parser.add_argument("--no-db", action="store_true", help="Do not write directly to DB, only export CSV")
    args = parser.parse_args()

    generate_benchmark_data(count=args.count, export_csv_path=args.export_csv, seed_database=not args.no_db)
