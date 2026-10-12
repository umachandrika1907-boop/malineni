from sqlalchemy import Column, String, Integer, Boolean, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Student(BaseModel):
    """Master student record. Must exist before any data can be uploaded for this student."""
    __tablename__ = "students"

    # Link to login account (NULL until student activates their account)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, unique=True)

    # Institution-assigned ID, e.g. "22CS001"
    student_id_str = Column(String(20), unique=True, nullable=False, index=True)

    full_name = Column(String(200), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    phone = Column(String(20), nullable=True)

    department = Column(String(100), nullable=False)
    program = Column(String(100), nullable=False)   # e.g. "B.Tech CSE"
    year_of_study = Column(Integer, nullable=False)  # 1, 2, 3, 4
    current_semester = Column(Integer, nullable=False)  # 1–8
    enrollment_date = Column(Date, nullable=False)

    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    user = relationship("User", back_populates="student_profile")
    academic_records = relationship("AcademicRecord", back_populates="student", cascade="all, delete-orphan")
    attendance_logs = relationship("AttendanceLog", back_populates="student", cascade="all, delete-orphan")
    lms_activities = relationship("LMSActivity", back_populates="student", cascade="all, delete-orphan")
    engagement_activities = relationship("EngagementActivity", back_populates="student", cascade="all, delete-orphan")
    skill_assessments = relationship("SkillAssessment", back_populates="student", cascade="all, delete-orphan")
    placement_records = relationship("PlacementRecord", back_populates="student", cascade="all, delete-orphan")
    feedbacks = relationship("Feedback", back_populates="student", cascade="all, delete-orphan")
    success_scores = relationship("SuccessScore", back_populates="student", cascade="all, delete-orphan")
    interventions = relationship(
        "Intervention", foreign_keys="Intervention.student_id", back_populates="student"
    )

    @property
    def latest_score(self):
        if hasattr(self, "_latest_score"):
            return self._latest_score
        if self.success_scores:
            return sorted(self.success_scores, key=lambda s: s.created_at, reverse=True)[0]
        return None

    @property
    def total_score(self):
        if hasattr(self, "_total_score_val") and self._total_score_val is not None:
            return self._total_score_val
        s = getattr(self, "_latest_score", None) or self.latest_score
        return s.total_score if s else None

    @total_score.setter
    def total_score(self, value):
        self._total_score_val = value

    @property
    def risk_segment(self):
        if hasattr(self, "_risk_segment_val") and self._risk_segment_val is not None:
            return self._risk_segment_val
        s = getattr(self, "_latest_score", None) or self.latest_score
        return s.risk_segment if s else None

    @risk_segment.setter
    def risk_segment(self, value):
        self._risk_segment_val = value

    @property
    def data_completeness_pct(self):
        if hasattr(self, "_data_completeness_val") and self._data_completeness_val is not None:
            return self._data_completeness_val
        s = getattr(self, "_latest_score", None) or self.latest_score
        return s.data_completeness_pct if s else None

    @data_completeness_pct.setter
    def data_completeness_pct(self, value):
        self._data_completeness_val = value

    def __repr__(self):
        return f"<Student {self.student_id_str} — {self.full_name}>"
