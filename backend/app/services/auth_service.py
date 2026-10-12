"""
Auth service — business logic for login, token management, and user creation.
No HTTP/FastAPI imports here — pure business logic only.
"""
from datetime import datetime, timezone
from typing import Optional, Tuple
from sqlalchemy.orm import Session

from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token,
)
from app.models.user import User
from app.schemas.auth import UserCreate


class AuthService:

    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
        """
        Validates credentials. Returns the User if valid, None otherwise.
        Does NOT raise exceptions — caller decides how to handle None.
        """
        user = db.query(User).filter(User.email == email, User.is_active == True).first()
        if user is None:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    @staticmethod
    def create_tokens(user: User) -> Tuple[str, str]:
        """Creates and returns (access_token, refresh_token) for a user."""
        data = {"sub": str(user.id), "role": user.role}
        access_token = create_access_token(data)
        refresh_token = create_refresh_token(data)
        return access_token, refresh_token

    @staticmethod
    def create_user(db: Session, user_data: UserCreate) -> User:
        """Creates a new user account. Raises ValueError if email already exists."""
        existing = db.query(User).filter(User.email == user_data.email).first()
        if existing:
            raise ValueError(f"Email '{user_data.email}' is already registered.")

        user = User(
            email=user_data.email,
            hashed_password=hash_password(user_data.password),
            role=user_data.role,
            department=user_data.department,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        if user.role == "STUDENT":
            try:
                from datetime import date
                from app.models.student import Student
                existing_student = db.query(Student).filter(Student.email == user.email).first()
                if existing_student:
                    existing_student.user_id = user.id
                    db.commit()
                else:
                    new_student = Student(
                        user_id=user.id,
                        student_id_str=f"STU{user.id:04d}",
                        full_name=user.email.split('@')[0].replace('.', ' ').title(),
                        email=user.email,
                        department=user.department or "Computer Science",
                        program="B.Tech CSE",
                        year_of_study=3,
                        current_semester=5,
                        enrollment_date=date(2023, 8, 1),
                        is_active=True,
                    )
                    db.add(new_student)
                    db.commit()
                    db.refresh(new_student)

                    from app.models.academic_record import AcademicRecord
                    from app.services.scoring_service import ScoringService
                    demo_subjects = [
                        ("CS501", "Design and Analysis of Algorithms", 84.0, 100.0, "A"),
                        ("CS502", "Database Management Systems", 78.5, 100.0, "B"),
                        ("CS503", "Computer Networks", 88.0, 100.0, "A"),
                        ("CS504", "Machine Learning & AI", 92.0, 100.0, "A+"),
                    ]
                    for code, name, marks, max_m, gr in demo_subjects:
                        rec = AcademicRecord(
                            student_id=new_student.id,
                            subject_code=code,
                            subject_name=name,
                            semester=5,
                            academic_year="2025-26",
                            marks_obtained=marks,
                            max_marks=max_m,
                            percentage=(marks / max_m) * 100,
                            grade=gr,
                        )
                        db.add(rec)
                    db.commit()
                    ScoringService.compute_student_score(db, new_student.id)
            except Exception:
                pass

        return user

    @staticmethod
    def refresh_access_token(db: Session, refresh_token: str) -> Optional[Tuple[str, User]]:
        """
        Validates a refresh token and issues a new access token.
        Returns (new_access_token, user) or None if the refresh token is invalid.
        """
        payload = decode_token(refresh_token)
        if payload is None or payload.get("type") != "refresh":
            return None

        user_id = int(payload.get("sub", 0))
        user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
        if user is None:
            return None

        data = {"sub": str(user.id), "role": user.role}
        new_access_token = create_access_token(data)
        return new_access_token, user

    @staticmethod
    def change_password(db: Session, user: User, current_password: str, new_password: str) -> bool:
        """Changes user password. Returns False if current_password is wrong."""
        if not verify_password(current_password, user.hashed_password):
            return False
        user.hashed_password = hash_password(new_password)
        db.commit()
        return True
