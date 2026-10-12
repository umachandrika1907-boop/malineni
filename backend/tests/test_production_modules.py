"""
Production Modules Comprehensive Test Suite for EduSuccessAI Platform.
Tests:
- Module 1: Data Ingestion & Seeding Engine
- Module 2: Deterministic Success & Risk Scoring Engine
- Module 3: Vector Store & RAG Recovery Advisor
- API Endpoints: Data upload, score recomputation, action plan generation
"""
import io
import json
import pytest
from datetime import date
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import SessionLocal
from app.models.student import Student
from app.models.user import User
from app.models.success_score import SuccessScore
from app.api.deps import get_current_user, get_optional_current_user
from app.services.scoring_service import ScoringService
from app.services.ingestion_service import IngestionService
from app.services.rag_service import (
    RAGService,
    PolicyKnowledgeStore,
    INSTITUTIONAL_POLICIES,
)

client = TestClient(app)


# Mock authenticated admin user for API tests
class MockUser:
    id = 1
    email = "admin@edusuccess.edu"
    role = "ADMIN"
    is_active = True
    department = "ALL"


# ---------------------------------------------------------------------------
# Module 2 Tests: Deterministic Scoring & Risk Segments
# ---------------------------------------------------------------------------

def test_risk_segmentation_bands():
    """Verify exact segment classification per specification."""
    # SAFE: Score >= 80 and Attendance >= 80%
    segment, _, _ = ScoringService.determine_risk_segment(85.0, 90.0)
    assert segment == "SAFE"

    segment, _, _ = ScoringService.determine_risk_segment(80.0, 80.0)
    assert segment == "SAFE"

    # Attendance < 80 drops score >= 80 to LOW_RISK or HIGH_RISK
    segment, _, _ = ScoringService.determine_risk_segment(85.0, 78.0)
    assert segment == "LOW_RISK"

    segment, _, _ = ScoringService.determine_risk_segment(85.0, 72.0)
    assert segment == "HIGH_RISK"  # Attn < 75% trigger

    # LOW_RISK: Score 70-79
    segment, _, _ = ScoringService.determine_risk_segment(75.0, 85.0)
    assert segment == "LOW_RISK"

    segment, _, _ = ScoringService.determine_risk_segment(70.0, 76.0)
    assert segment == "LOW_RISK"

    # MEDIUM_RISK: Score 55-69
    segment, _, _ = ScoringService.determine_risk_segment(65.0, 80.0)
    assert segment == "MEDIUM_RISK"

    segment, _, _ = ScoringService.determine_risk_segment(55.0, 75.0)
    assert segment == "MEDIUM_RISK"

    # HIGH_RISK: Score 40-54 or Attendance < 75%
    segment, _, _ = ScoringService.determine_risk_segment(50.0, 76.0)
    assert segment == "HIGH_RISK"

    segment, _, _ = ScoringService.determine_risk_segment(75.0, 74.0)
    assert segment == "HIGH_RISK"

    # CRITICAL: Score < 40 or Attendance < 60%
    segment, _, _ = ScoringService.determine_risk_segment(38.0, 85.0)
    assert segment == "CRITICAL"

    segment, _, _ = ScoringService.determine_risk_segment(75.0, 58.0)
    assert segment == "CRITICAL"

    segment, _, _ = ScoringService.determine_risk_segment(30.0, 50.0)
    assert segment == "CRITICAL"


def test_scoring_weights():
    """Verify default architectural weights: 0.40 academic, 0.30 attendance, 0.20 LMS, 0.10 engagement."""
    weights = ScoringService.DEFAULT_WEIGHTS
    assert weights["academic"] == 0.40
    assert weights["attendance"] == 0.30
    assert weights["lms"] == 0.20
    assert weights["engagement"] == 0.10
    assert sum(weights.values()) == 1.0


# ---------------------------------------------------------------------------
# Module 3 Tests: Vector Store & RAG Institutional Knowledge
# ---------------------------------------------------------------------------

def test_institutional_policy_store_retrieval():
    """Verify that institutional policy vector store retrieves relevant docs for specific queries."""
    store = PolicyKnowledgeStore.get_instance()
    assert len(store.documents) >= 5

    # Attendance deficiency query
    attn_matches = store.search("attendance shortage condonation debarment warning", top_k=2)
    assert len(attn_matches) >= 1
    top_doc = attn_matches[0][0]
    assert top_doc.doc_id == "POL-ATTN-02"

    # Academic coaching query
    acad_matches = store.search("failing marks remedial coaching clinic math probation", top_k=2)
    assert len(acad_matches) >= 1
    assert any(doc.category == "ACADEMIC_REMEDIAL" for doc, _ in acad_matches)


def test_rag_action_plan_generator():
    """Verify end-to-end action plan generation for active student."""
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.student_id_str == "24CS001").first()
        if student:
            plan = RAGService.generate_action_plan(db, "24CS001", save_as_intervention=False)
            assert plan["success"] is True
            assert plan["student_id_str"] == "24CS001"
            assert "action_plan_markdown" in plan
            assert len(plan["retrieved_policies"]) > 0
            assert "Week 1" in plan["action_plan_markdown"]
            assert "Week 2" in plan["action_plan_markdown"]
            assert "Week 3" in plan["action_plan_markdown"]
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Module 1 & 4 API Tests
# ---------------------------------------------------------------------------

def test_health_endpoint():
    """Verify system health endpoint is live."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_recalculate_scores_endpoint():
    """Verify recalculate scores endpoint triggers successfully with authenticated user."""
    app.dependency_overrides[get_current_user] = lambda: MockUser()
    try:
        response = client.post("/api/v1/data/recalculate-scores", json={"semester": 3, "academic_year": "2025-26"})
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "scores_computed" in data
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_csv_upload_endpoint_validation():
    """Verify data upload endpoint validates file formats and parses sample CSV."""
    app.dependency_overrides[get_current_user] = lambda: MockUser()
    try:
        csv_content = (
            "student_id,subject_code,subject_name,marks_obtained,max_marks,semester,academic_year\n"
            "24CS001,CS301,Data Structures,78,100,3,2025-26\n"
            "24CS001,CS302,Discrete Mathematics,82,100,3,2025-26\n"
        )

        response = client.post(
            "/api/v1/data/upload",
            files={"file": ("test_grades.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")},
            data={"dimension": "ACADEMIC", "semester": "3", "academic_year": "2025-26", "auto_recompute": "false"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["inserted_records"] == 2
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_upload_with_bearer_token():
    """Verify data upload succeeds using Authorization Bearer token header."""
    from app.core.security import create_access_token
    from app.core.database import SessionLocal
    from app.models.user import User

    db = SessionLocal()
    admin_user = db.query(User).filter(User.role == "ADMIN", User.is_active == True).first()
    if not admin_user:
        admin_user = User(
            email="test_bearer_admin@edusuccess.edu",
            hashed_password="some_hashed_pwd",
            role="ADMIN",
            is_active=True,
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
    user_id = admin_user.id
    db.close()

    token = create_access_token({"sub": str(user_id), "role": "ADMIN"})

    csv_content = (
        "student_id,subject_code,subject_name,marks_obtained,max_marks,semester,academic_year\n"
        "24CS001,CS301,Data Structures,88,100,3,2025-26\n"
    )

    # Test request with Authorization: Bearer <token>
    response = client.post(
        "/api/v1/data/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("bearer_grades.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")},
        data={"dimension": "ACADEMIC", "semester": "3", "academic_year": "2025-26", "auto_recompute": "false"},
    )
    assert response.status_code == 200
    assert response.json()["success"] is True


def test_auth_refresh_flow():
    """Verify refresh endpoint accepts refresh_token in JSON payload and returns new access_token."""
    from app.core.security import create_refresh_token
    from app.core.database import SessionLocal
    from app.models.user import User

    db = SessionLocal()
    admin_user = db.query(User).filter(User.role == "ADMIN", User.is_active == True).first()
    assert admin_user is not None
    user_id = admin_user.id
    db.close()

    refresh_jwt = create_refresh_token({"sub": str(user_id), "role": "ADMIN"})
    response = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_jwt},
    )
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


def test_comprehensive_upload_reupload_collision_prevention():
    """Verify that multi-dimensional ingestion handles existing students & re-uploads without UNIQUE constraint errors."""
    from app.core.security import create_access_token
    from app.core.database import SessionLocal
    from app.models.user import User

    db = SessionLocal()
    admin_user = db.query(User).filter(User.role == "ADMIN", User.is_active == True).first()
    assert admin_user is not None
    user_id = admin_user.id
    db.close()

    token = create_access_token({"sub": str(user_id), "role": "ADMIN"})

    # Flat comprehensive dataset with duplicate rows and multi-dimension metrics
    csv_payload = (
        "student_id,full_name,department,marks,attendance,logins,semester\n"
        "24CS001,Aarav Sharma,Computer Science,85.5,92.0,14,3\n"
        "24CS002,Priya Nair,Electronics,72.0,81.0,8,3\n"
        "24CS001,Aarav Sharma,Computer Science,87.0,94.0,16,3\n"  # Intra-batch duplicate key!
    )

    # First upload
    res1 = client.post(
        "/api/v1/data/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("dummy_student_data.csv", io.BytesIO(csv_payload.encode("utf-8")), "text/csv")},
        data={"dimension": "COMPREHENSIVE", "semester": "3", "auto_recompute": "true"},
    )
    assert res1.status_code == 200, res1.text
    data1 = res1.json()
    assert data1["success"] is True

    # Second upload of the EXACT same records (should cleanly update / overwrite without UNIQUE constraint crash)
    res2 = client.post(
        "/api/v1/data/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("dummy_student_data.csv", io.BytesIO(csv_payload.encode("utf-8")), "text/csv")},
        data={"dimension": "COMPREHENSIVE", "semester": "3", "auto_recompute": "true"},
    )
    assert res2.status_code == 200, res2.text
    data2 = res2.json()
    assert data2["success"] is True


