from sqlalchemy import Column, String, Integer, Text, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Feedback(BaseModel):
    """Student feedback from various sources."""
    __tablename__ = "feedback"

    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)

    # SELF, FACULTY, PEER, COUNSELOR
    source = Column(String(20), nullable=False)

    feedback_text = Column(Text, nullable=True)
    satisfaction_rating = Column(Integer, nullable=True)  # 1–5

    # ACADEMIC, PLACEMENT, GENERAL, WELLBEING
    category = Column(String(20), nullable=True)

    semester = Column(Integer, nullable=False)
    submitted_at = Column(Date, nullable=False)

    upload_batch_id = Column(Integer, ForeignKey("csv_upload_logs.id"), nullable=True)

    # Relationships
    student = relationship("Student", back_populates="feedbacks")
    upload_batch = relationship("CSVUploadLog")

    def __repr__(self):
        return f"<Feedback student={self.student_id} source={self.source}>"
