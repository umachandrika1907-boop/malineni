from sqlalchemy import Column, String, Integer, Float, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class SuccessScore(BaseModel):
    """
    Computed student success score snapshot.

    IMPORTANT: Rows are NEVER updated after insertion.
    Every recomputation inserts a NEW row. Queries for the current score
    select WHERE computed_at = MAX(computed_at) for a given student/semester.

    This preserves complete score history for trend analysis.
    """
    __tablename__ = "success_scores"

    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    semester = Column(Integer, nullable=False)
    academic_year = Column(String(10), nullable=False)

    # Sub-scores (NULL if no data available for that dimension)
    academic_sub_score = Column(Float, nullable=True)
    attendance_sub_score = Column(Float, nullable=True)
    lms_sub_score = Column(Float, nullable=True)
    engagement_sub_score = Column(Float, nullable=True)
    skills_sub_score = Column(Float, nullable=True)
    placement_sub_score = Column(Float, nullable=True)

    # Weights actually applied at compute time (from ScoreWeightConfig)
    academic_weight = Column(Float, nullable=False, default=0.30)
    attendance_weight = Column(Float, nullable=False, default=0.20)
    lms_weight = Column(Float, nullable=False, default=0.15)
    engagement_weight = Column(Float, nullable=False, default=0.10)
    skills_weight = Column(Float, nullable=False, default=0.15)
    placement_weight = Column(Float, nullable=False, default=0.10)

    # Final aggregated score (NULL if all dimensions are missing)
    total_score = Column(Float, nullable=True)

    # Segment: HIGH_PERFORMER | ON_TRACK | NEEDS_ATTENTION | AT_RISK | CRITICAL | NO_DATA
    risk_segment = Column(String(20), nullable=False, default="NO_DATA")

    # Percentage of dimensions that have data (0–100)
    data_completeness_pct = Column(Float, nullable=False, default=0.0)

    # Explainability: JSON array of per-dimension explanation strings
    # e.g. [{"dimension": "attendance", "status": "WEAK", "message": "Attendance is 58%..."}]
    explanation_json = Column(Text, nullable=False, default="[]")

    # Active intervention flags: JSON array of flag name strings
    # e.g. ["LOW_ATTENDANCE", "ACADEMIC_DECLINE"]
    active_flags = Column(Text, nullable=True, default="[]")

    # Rule-based recommendation: JSON object with study_plan, placement_actions, priority_areas
    recommendation_json = Column(Text, nullable=True)

    # Relationships
    student = relationship("Student", back_populates="success_scores")

    def __repr__(self):
        return f"<SuccessScore student={self.student_id} score={self.total_score} [{self.risk_segment}]>"
