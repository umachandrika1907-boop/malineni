"""
Students router — CRUD + search + filtered listing.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, require_roles, get_current_active_student
from app.models.user import User
from app.models.student import Student
from app.models.academic_record import AcademicRecord
from app.schemas.student import StudentCreate, StudentUpdate, StudentSummary, StudentDetail
from app.services.student_service import StudentService

router = APIRouter(prefix="/students", tags=["Students"])


@router.get("", response_model=dict)
def list_students(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    department: Optional[str] = Query(None),
    year_of_study: Optional[int] = Query(None),
    semester: Optional[int] = Query(None),
    risk_segment: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "FACULTY", "COUNSELOR"])),
):
    """
    Paginated, filterable student list with latest score snapshot.
    Faculty see only their department's students automatically.
    """
    # Faculty department restriction enforced in service layer
    dept_filter = department
    if current_user.role == "FACULTY" and current_user.department:
        dept_filter = current_user.department

    students, total = StudentService.list_students(
        db,
        page=page,
        per_page=per_page,
        department=dept_filter,
        year_of_study=year_of_study,
        semester=semester,
        risk_segment=risk_segment,
        search=search,
    )

    return {
        "success": True,
        "data": [StudentSummary.model_validate(s) for s in students],
        "meta": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": (total + per_page - 1) // per_page,
        },
    }


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_student(
    payload: StudentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "FACULTY"])),
):
    """Create a new student record."""
    if current_user.role == "FACULTY" and current_user.department:
        payload.department = current_user.department

    try:
        student = StudentService.create_student(db, payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    return {"success": True, "data": StudentDetail.model_validate(student), "message": "Student created."}


@router.get("/me", response_model=dict)
def get_my_profile(
    student=Depends(get_current_active_student),
    db: Session = Depends(get_db),
):
    """Student's own profile endpoint."""
    student = StudentService.get_student_with_score(db, student.id)
    return {"success": True, "data": StudentDetail.model_validate(student)}


@router.get("/{student_id}", response_model=dict)
def get_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "FACULTY", "COUNSELOR"])),
):
    """Full student profile with latest score."""
    student = StudentService.get_student_with_score(db, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

    # Faculty department restriction
    if current_user.role == "FACULTY" and current_user.department:
        if student.department != current_user.department:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return {"success": True, "data": StudentDetail.model_validate(student)}


@router.put("/{student_id}", response_model=dict)
def update_student(
    student_id: int,
    payload: StudentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "FACULTY"])),
):
    """Update student profile. Allowed for Admins and Department Faculty."""
    student = StudentService.get_student_with_score(db, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

    if current_user.role == "FACULTY" and current_user.department and student.department != current_user.department:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to other departments.")

    updated = StudentService.update_student(db, student_id, payload)
    return {"success": True, "data": StudentDetail.model_validate(updated), "message": "Student updated."}


@router.delete("/{student_id}", response_model=dict)
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"])),
):
    """Soft-delete a student. Admin only."""
    success = StudentService.soft_delete_student(db, student_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")
    return {"success": True, "message": "Student deactivated."}


@router.get("/{student_id}/marks", response_model=dict)
def get_student_marks(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch academic subject marks and grades for a student."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

    if current_user.role == "STUDENT":
        if not current_user.student_profile or current_user.student_profile.id != student_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    elif current_user.role == "FACULTY" and current_user.department and student.department != current_user.department:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to other departments.")

    records = db.query(AcademicRecord).filter(
        AcademicRecord.student_id == student_id,
        AcademicRecord.is_superseded == False,
    ).order_by(AcademicRecord.semester.desc(), AcademicRecord.created_at.desc()).all()

    return {
        "success": True,
        "data": [
            {
                "id": r.id,
                "subject_code": r.subject_code,
                "subject_name": r.subject_name,
                "semester": r.semester,
                "academic_year": r.academic_year,
                "marks_obtained": r.marks_obtained,
                "max_marks": r.max_marks,
                "percentage": r.percentage,
                "grade": r.grade,
            }
            for r in records
        ],
    }


@router.post("/{student_id}/marks", response_model=dict, status_code=status.HTTP_201_CREATED)
def add_student_marks(
    student_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "FACULTY"])),
):
    """Add or update an academic subject mark for a student."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

    if current_user.role == "FACULTY" and current_user.department and student.department != current_user.department:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to other departments.")

    subject_code = str(payload.get("subject_code", "CS501")).strip()
    subject_name = str(payload.get("subject_name", "Core Subject")).strip()
    semester = int(payload.get("semester", student.current_semester or 1))
    academic_year = str(payload.get("academic_year", "2025-26")).strip()
    marks_obtained = float(payload.get("marks_obtained", 75.0))
    max_marks = float(payload.get("max_marks", 100.0))
    percentage = (marks_obtained / max_marks) * 100 if max_marks > 0 else 0

    if percentage >= 90:
        grade = "A+"
    elif percentage >= 80:
        grade = "A"
    elif percentage >= 70:
        grade = "B"
    elif percentage >= 60:
        grade = "C"
    elif percentage >= 50:
        grade = "D"
    else:
        grade = "F"

    record = (
        db.query(AcademicRecord)
        .filter(
            AcademicRecord.student_id == student.id,
            AcademicRecord.subject_code == subject_code,
            AcademicRecord.semester == semester,
            AcademicRecord.academic_year == academic_year,
            AcademicRecord.is_superseded == False,
        )
        .first()
    )

    if record:
        record.subject_name = subject_name
        record.marks_obtained = marks_obtained
        record.max_marks = max_marks
        record.percentage = round(percentage, 2)
        record.grade = grade
    else:
        record = AcademicRecord(
            student_id=student.id,
            subject_code=subject_code,
            subject_name=subject_name,
            semester=semester,
            academic_year=academic_year,
            marks_obtained=marks_obtained,
            max_marks=max_marks,
            percentage=round(percentage, 2),
            grade=grade,
            is_superseded=False,
        )
        db.add(record)

    db.commit()

    # Recompute student score snapshot
    try:
        from app.services.scoring_service import ScoringService
        ScoringService.compute_student_score(db, student.id)
    except Exception:
        pass

    return {
        "success": True,
        "message": f"Successfully recorded mark for {subject_code} ({grade})",
        "data": {
            "id": record.id,
            "subject_code": record.subject_code,
            "subject_name": record.subject_name,
            "semester": record.semester,
            "marks_obtained": record.marks_obtained,
            "max_marks": record.max_marks,
            "percentage": record.percentage,
            "grade": record.grade,
        },
    }
