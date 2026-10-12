"""
FastAPI shared dependencies — injected into route handlers.

Usage in a route:
    @router.get("/students")
    def list_students(
        db: Session = Depends(get_db),
        current_user: User = Depends(require_roles(["ADMIN", "FACULTY"]))
    ):
        ...
"""
from typing import List, Optional
from fastapi import Depends, HTTPException, Cookie, Header, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User
from app.models.student import Student


def get_current_user(
    access_token: str = Cookie(default=None),
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    """
    Extracts and validates JWT from Authorization Bearer header or httpOnly cookie.
    Returns the authenticated User ORM object.
    Raises HTTP 401 if token is missing, invalid, or expired.
    """
    token = access_token
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated. Please log in.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not token:
        raise credentials_exception

    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        raise credentials_exception

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise credentials_exception

    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if user is None:
        raise credentials_exception

    return user


def get_optional_current_user(
    access_token: str = Cookie(default=None),
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    Optional user dependency. Returns the User if authenticated, otherwise None.
    Does not raise HTTP 401 exceptions.
    """
    token = access_token
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()

    if not token:
        return None

    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        return None

    user_id_str = payload.get("sub")
    if not user_id_str:
        return None

    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        return None

    return db.query(User).filter(User.id == user_id, User.is_active == True).first()


def require_roles(allowed_roles: List[str]):
    """
    Factory that returns a FastAPI dependency enforcing role-based access.

    Example:
        Depends(require_roles(["ADMIN", "FACULTY"]))

    Raises HTTP 403 if the authenticated user's role is not in allowed_roles.
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(allowed_roles)}",
            )
        return current_user

    return role_checker


def get_current_active_student(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Dependency for student-only routes.
    Returns the Student profile linked to the authenticated student user.
    Auto-links by email or user_id if not yet bound.
    """
    if current_user.role != "STUDENT":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Students only.")

    if current_user.student_profile is not None:
        return current_user.student_profile

    # Look up existing student with matching email
    student = db.query(Student).filter(Student.email == current_user.email).first()
    if not student:
        student = db.query(Student).filter(Student.user_id == current_user.id).first()

    if student:
        student.user_id = current_user.id
        db.commit()
        db.refresh(student)
        return student

    # If no student profile exists yet, create one so the dashboard never errors
    from datetime import date
    student = Student(
        user_id=current_user.id,
        student_id_str=f"STU{current_user.id:04d}",
        full_name=current_user.email.split('@')[0].replace('.', ' ').title(),
        email=current_user.email,
        department=current_user.department or "Computer Science",
        program="B.Tech CSE",
        year_of_study=3,
        current_semester=5,
        enrollment_date=date(2023, 8, 1),
        is_active=True,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student
