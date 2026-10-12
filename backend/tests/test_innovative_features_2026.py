"""
EduSuccessAI - 2026/2027 Innovative Features Test Suite
Verifies:
  1. Predictive Trajectory Forecaster (What-If Simulator)
  2. Autonomous Institutional Policy & Regulation Copilot (RAG)
  3. Cohort Breakdown & Department Health Matrix
"""
import pytest
from starlette.testclient import TestClient

from app.main import app
from app.core.security import create_access_token
from app.core.database import SessionLocal
from app.models.user import User

client = TestClient(app)


def get_admin_auth_headers():
    db = SessionLocal()
    admin = db.query(User).filter(User.role == "ADMIN").first()
    token = create_access_token({"sub": str(admin.id), "email": admin.email, "role": "ADMIN"})
    db.close()
    return {"Authorization": f"Bearer {token}"}


def test_trajectory_simulation():
    payload = {
        "student_id_str": "24CS001",
        "current_attendance": 64.0,
        "current_academics": 52.0,
        "current_lms_logins": 2.0,
        "simulated_attendance": 82.0,
        "simulated_academics": 75.0,
        "simulated_lms_logins": 10.0,
        "simulated_assignments_pct": 95.0,
    }
    response = client.post("/api/v1/ai/simulate-trajectory", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["projected_score"] > data["current_score"]
    assert "SAFE" in data["projected_risk"] or "LOW_RISK" in data["projected_risk"]
    assert len(data["trajectory_insights"]) > 0
    assert len(data["recovery_milestones"]) > 0


def test_policy_copilot_query():
    payload = {
        "query": "What are the rules and attendance percentage required to avoid examination debarment?",
        "top_k": 2,
    }
    response = client.post("/api/v1/ai/policy-query", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["policies"]) > 0
    assert "75%" in data["policies"][0]["summary"] or "attendance" in data["policies"][0]["tags"] or "Attendance" in data["policies"][0]["title"]
    assert len(data["answer"]) > 20


def test_cohort_breakdown_endpoint():
    headers = get_admin_auth_headers()
    response = client.get("/api/v1/data/cohort-breakdown", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "departments" in data
    assert len(data["departments"]) >= 1
    dept = data["departments"][0]
    assert "department" in dept
    assert "avg_score" in dept
    assert "health_status" in dept
