from sqlalchemy import Column, String, Integer, Float, Boolean, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class SkillAssessment(BaseModel):
    """
    Individual skill evaluation scores.
    Multiple assessments per skill are preserved — no UNIQUE constraint here.
    Use the latest assessment_date per skill_name for current score.
    """
    __tablename__ = "skill_assessments"

    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    skill_name = Column(String(100), nullable=False)

    # TECHNICAL, SOFT, DOMAIN
    skill_category = Column(String(20), nullable=False)

    score = Column(Float, nullable=False)  # 0–100
    assessed_by = Column(String(200), nullable=False)
    assessment_date = Column(Date, nullable=False)
    semester = Column(Integer, nullable=False)

    is_superseded = Column(Boolean, default=False, nullable=False)
    upload_batch_id = Column(Integer, ForeignKey("csv_upload_logs.id"), nullable=True)

    # Relationships
    student = relationship("Student", back_populates="skill_assessments")
    upload_batch = relationship("CSVUploadLog")

    def __repr__(self):
        return f"<SkillAssessment student={self.student_id} {self.skill_name}={self.score}>"
