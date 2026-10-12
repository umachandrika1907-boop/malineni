from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date


class StudentCreate(BaseModel):
    student_id_str: str
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    department: str
    program: str
    year_of_study: int
    current_semester: int
    enrollment_date: date


class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    program: Optional[str] = None
    year_of_study: Optional[int] = None
    current_semester: Optional[int] = None


class StudentSummary(BaseModel):
    """Compact student card — used in list views."""
    id: int
    student_id_str: str
    full_name: str
    department: str
    program: str
    year_of_study: int
    current_semester: int
    is_active: bool
    # Latest score snapshot (joined from success_scores)
    total_score: Optional[float] = None
    risk_segment: Optional[str] = None
    data_completeness_pct: Optional[float] = None

    class Config:
        from_attributes = True


class StudentDetail(StudentSummary):
    """Full student profile — used in detail view."""
    email: str
    phone: Optional[str] = None
    enrollment_date: date

    class Config:
        from_attributes = True
