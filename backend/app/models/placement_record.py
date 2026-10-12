from sqlalchemy import Column, String, Integer, Float, Boolean, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class PlacementRecord(BaseModel):
    """Placement readiness assessment — aptitude, coding, communication, mock interview."""
    __tablename__ = "placement_records"

    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)

    aptitude_score = Column(Float, nullable=True)        # 0–100
    coding_score = Column(Float, nullable=True)          # 0–100
    communication_score = Column(Float, nullable=True)   # 0–100
    mock_interview_score = Column(Float, nullable=True)  # 0–100

    # NOT_STARTED, DRAFT, REVIEWED, FINAL
    resume_status = Column(String(20), nullable=True, default="NOT_STARTED")
    internship_count = Column(Integer, default=0, nullable=False)

    assessed_date = Column(Date, nullable=False)
    semester = Column(Integer, nullable=False)

    is_superseded = Column(Boolean, default=False, nullable=False)
    upload_batch_id = Column(Integer, ForeignKey("csv_upload_logs.id"), nullable=True)

    # Relationships
    student = relationship("Student", back_populates="placement_records")
    upload_batch = relationship("CSVUploadLog")

    def __repr__(self):
        return f"<PlacementRecord student={self.student_id} S{self.semester}>"
