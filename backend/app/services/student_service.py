"""Student service — CRUD orchestration."""
from typing import Optional, Tuple, List
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.models.student import Student
from app.models.success_score import SuccessScore
from app.schemas.student import StudentCreate, StudentUpdate


class StudentService:

    @staticmethod
    def list_students(
        db: Session,
        page: int = 1,
        per_page: int = 20,
        department: Optional[str] = None,
        year_of_study: Optional[int] = None,
        semester: Optional[int] = None,
        risk_segment: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[Student], int]:
        """
        Returns (students_with_latest_score, total_count).
        Joins latest success_score for each student.
        """
        # Subquery: latest score per student
        latest_score_subq = (
            db.query(
                SuccessScore.student_id,
                func.max(SuccessScore.created_at).label("latest_at"),
            )
            .group_by(SuccessScore.student_id)
            .subquery()
        )

        query = (
            db.query(Student)
            .outerjoin(
                latest_score_subq,
                Student.id == latest_score_subq.c.student_id,
            )
            .outerjoin(
                SuccessScore,
                (SuccessScore.student_id == Student.id)
                & (SuccessScore.created_at == latest_score_subq.c.latest_at),
            )
            .filter(Student.is_active == True)
        )

        if department:
            query = query.filter(Student.department == department)
        if year_of_study:
            query = query.filter(Student.year_of_study == year_of_study)
        if semester:
            query = query.filter(Student.current_semester == semester)
        if risk_segment:
            query = query.filter(SuccessScore.risk_segment == risk_segment)
        if search:
            pattern = f"%{search}%"
            query = query.filter(
                or_(
                    Student.full_name.ilike(pattern),
                    Student.student_id_str.ilike(pattern),
                )
            )

        total = query.count()
        students = query.offset((page - 1) * per_page).limit(per_page).all()

        # Attach latest score to each student for the response
        for student in students:
            latest = (
                db.query(SuccessScore)
                .filter(SuccessScore.student_id == student.id)
                .order_by(SuccessScore.created_at.desc())
                .first()
            )
            student._latest_score = latest
            student.total_score = latest.total_score if latest else None
            student.risk_segment = latest.risk_segment if latest else None
            student.data_completeness_pct = latest.data_completeness_pct if latest else None

        return students, total

    @staticmethod
    def get_student_with_score(db: Session, student_id: int) -> Optional[Student]:
        student = db.query(Student).filter(Student.id == student_id).first()
        if student:
            latest = (
                db.query(SuccessScore)
                .filter(SuccessScore.student_id == student_id)
                .order_by(SuccessScore.created_at.desc())
                .first()
            )
            student._latest_score = latest
            student.total_score = latest.total_score if latest else None
            student.risk_segment = latest.risk_segment if latest else None
            student.data_completeness_pct = latest.data_completeness_pct if latest else None
        return student

    @staticmethod
    def create_student(db: Session, data: StudentCreate) -> Student:
        existing_id = db.query(Student).filter(Student.student_id_str == data.student_id_str).first()
        if existing_id:
            raise ValueError(f"Student ID '{data.student_id_str}' already exists.")
        existing_email = db.query(Student).filter(Student.email == data.email).first()
        if existing_email:
            raise ValueError(f"Email '{data.email}' already registered.")

        student = Student(**data.model_dump())
        db.add(student)
        db.commit()
        db.refresh(student)
        return student

    @staticmethod
    def update_student(db: Session, student_id: int, data: StudentUpdate) -> Optional[Student]:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            return None
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(student, field, value)
        db.commit()
        db.refresh(student)
        return student

    @staticmethod
    def soft_delete_student(db: Session, student_id: int) -> bool:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            return False
        student.is_active = False
        db.commit()
        return True
