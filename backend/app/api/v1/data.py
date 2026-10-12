"""
EduSuccessAI - Data Ingestion & Scoring API Router
Handles multi-format bulk imports (CSV, XLSX, JSON) and on-demand score recalculation.
"""
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.models.user import User
from app.services.ingestion_service import IngestionService
from app.services.scoring_service import ScoringService

router = APIRouter(prefix="/data", tags=["Data Ingestion & Scoring"])


@router.post("/upload")
async def upload_dataset(
    file: UploadFile = File(..., description="CSV, Excel (.xlsx), or JSON dataset file"),
    data_type: Optional[str] = Form(None, description="AUTO, ACADEMIC, ATTENDANCE, LMS, ENGAGEMENT, STUDENTS, or COMPREHENSIVE"),
    dimension: Optional[str] = Form(None, description="Alias for data_type"),
    semester: Optional[int] = Form(None, description="Optional semester override (1-8)"),
    academic_year: Optional[str] = Form(None, description="Optional academic year (e.g. 2025-26)"),
    auto_recompute: Optional[bool] = Form(True, description="Whether to recalculate scores automatically"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "FACULTY"])),
):
    """
    High-volume dataset upload endpoint.
    Processes CSV/Excel/JSON files up to 70k+ records using bulk database operations.
    Automatically logs upload batch audit and recalculates affected student risk scores.
    """
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No file selected.")

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    # 15 MB limit
    if len(file_bytes) > 15 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File exceeds 15 MB limit.")

    resolved_data_type = (dimension or data_type or "AUTO").upper()

    try:
        result = IngestionService.process_upload(
            db=db,
            file_bytes=file_bytes,
            filename=file.filename,
            user_id=current_user.id,
            data_type=resolved_data_type,
            semester_override=semester,
        )
        return {
            "success": True,
            "message": f"Successfully processed {result['rows_imported']} records ({result['data_type']}).",
            "detected_format": result.get("format", "CSV"),
            "detected_dimension": result["data_type"],
            "inserted_records": result["rows_imported"],
            "superseded_records": result.get("superseded_records", 0),
            "skipped_records": result["rows_rejected"],
            "total_records_in_payload": result.get("row_count", 0),
            "scores_recalculated": result.get("scores_recomputed", 0),
            "upload_batch_id": result["batch_id"],
            "errors": result.get("errors", []),
            "details": result,
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ingestion failed: {str(e)}")


@router.post("/recalculate-scores")
def recalculate_scores(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "FACULTY"])),
):
    """
    On-demand recomputation of multi-dimensional success scores across all active students.
    """
    count = ScoringService.recompute_all_scores(db)
    return {
        "success": True,
        "message": f"Recomputed success scores and risk segmentation for {count} students.",
        "students_processed": count,
        "scores_computed": count,
    }


@router.post("/seed-benchmark")
def seed_benchmark(
    count: int = Form(50, description="Number of synthetic students to generate (10-10,000)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "FACULTY"])),
):
    """
    1-Click Benchmark Ingestion Engine for KPMG Campus Challenge.
    Generates realistic multi-dimensional student records with pre-computed risk scores.
    """
    safe_count = min(max(count, 5), 1000)
    from seed.generate_synthetic_benchmark import generate_benchmark_data
    generate_benchmark_data(count=safe_count, seed_database=True)
    return {
        "success": True,
        "message": f"Successfully generated and seeded {safe_count} benchmark students with multi-dimensional records.",
        "records_created": safe_count,
    }


@router.get("/cohort-breakdown")
def get_cohort_breakdown(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "FACULTY", "COUNSELOR"])),
):
    """
    Cross-Department Cohort Health Matrix & Dean's Executive Breakdown.
    Computes real-time distribution across Computer Science, Electronics, Mechanical,
    Management, and Data Science cohorts.
    """
    from app.models.student import Student
    from app.models.success_score import SuccessScore
    from sqlalchemy import func

    # Query all active students with latest score
    students = db.query(Student).filter(Student.is_active == True).all()
    
    dept_map = {}
    for s in students:
        dept = s.department or "General Engineering"
        if dept not in dept_map:
            dept_map[dept] = {
                "department": dept,
                "total_students": 0,
                "scores": [],
                "critical_count": 0,
                "high_risk_count": 0,
                "medium_risk_count": 0,
                "safe_count": 0,
            }
        
        dept_map[dept]["total_students"] += 1
        latest_score = (
            db.query(SuccessScore)
            .filter(SuccessScore.student_id == s.id)
            .order_by(SuccessScore.created_at.desc())
            .first()
        )
        if latest_score and latest_score.total_score is not None:
            dept_map[dept]["scores"].append(latest_score.total_score)
            risk = latest_score.risk_segment
            if risk == "CRITICAL":
                dept_map[dept]["critical_count"] += 1
            elif risk == "HIGH_RISK":
                dept_map[dept]["high_risk_count"] += 1
            elif risk == "MEDIUM_RISK":
                dept_map[dept]["medium_risk_count"] += 1
            else:
                dept_map[dept]["safe_count"] += 1

    departments_result = []
    for dept_name, data in dept_map.items():
        total = data["total_students"]
        scores = data["scores"]
        avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0
        at_risk = data["critical_count"] + data["high_risk_count"]
        at_risk_pct = round((at_risk / total) * 100.0, 1) if total > 0 else 0.0
        health_status = "Optimal" if at_risk_pct < 15.0 else ("Warning" if at_risk_pct < 35.0 else "Critical")

        departments_result.append({
            "department": dept_name,
            "total_students": total,
            "avg_score": avg_score,
            "at_risk_count": at_risk,
            "at_risk_pct": at_risk_pct,
            "critical_count": data["critical_count"],
            "high_risk_count": data["high_risk_count"],
            "safe_count": data["safe_count"],
            "health_status": health_status,
        })

    # Sort by at_risk_pct descending
    departments_result.sort(key=lambda x: x["at_risk_pct"], reverse=True)

    return {
        "success": True,
        "total_cohort_count": len(students),
        "departments": departments_result,
    }

