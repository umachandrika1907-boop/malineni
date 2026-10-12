from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class DimensionExplanation(BaseModel):
    """Per-dimension breakdown shown in the UI."""
    dimension: str          # academic, attendance, lms, engagement, skills, placement
    sub_score: Optional[float]
    weight: float
    weighted_contribution: Optional[float]
    status: str             # GOOD, AVERAGE, WEAK, MISSING
    message: str            # Plain-language explanation


class ScoreResponse(BaseModel):
    """Full score breakdown for a student — the primary explainability payload."""
    id: int
    student_id: int
    semester: int
    academic_year: str

    total_score: Optional[float]
    risk_segment: str
    data_completeness_pct: float

    # Individual sub-scores
    academic_sub_score: Optional[float]
    attendance_sub_score: Optional[float]
    lms_sub_score: Optional[float]
    engagement_sub_score: Optional[float]
    skills_sub_score: Optional[float]
    placement_sub_score: Optional[float]

    # Explanations (parsed from explanation_json)
    explanations: List[DimensionExplanation] = []

    # Active flags
    active_flags: List[str] = []

    # Rule-based recommendations (parsed from recommendation_json)
    recommendations: Optional[dict] = None

    computed_at: datetime

    class Config:
        from_attributes = True


class ScoreHistoryPoint(BaseModel):
    """Single data point for the trend line chart."""
    semester: int
    academic_year: str
    total_score: Optional[float]
    risk_segment: str
    computed_at: datetime

    class Config:
        from_attributes = True


class OverviewStats(BaseModel):
    """Dashboard overview KPIs."""
    total_students: int
    avg_score: Optional[float]
    at_risk_count: int          # AT_RISK + CRITICAL
    high_performer_count: int
    no_data_count: int
    segment_distribution: dict  # {"HIGH_PERFORMER": 12, "ON_TRACK": 45, ...}
    avg_attendance_pct: Optional[float]
    avg_academic_score: Optional[float]
    recent_flags_count: int     # flags generated in last 7 days
