from sqlalchemy import Column, String, Integer, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class EngagementActivity(BaseModel):
    """Student participation in extracurricular and institutional activities."""
    __tablename__ = "engagement_activities"

    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)

    # CLUB, HACKATHON, WORKSHOP, SEMINAR, SPORTS, OTHER
    activity_type = Column(String(20), nullable=False)
    activity_name = Column(String(200), nullable=False)
    activity_date = Column(Date, nullable=False)
    semester = Column(Integer, nullable=False)

    # Participant, Organizer, Winner
    role = Column(String(50), nullable=True)

    upload_batch_id = Column(Integer, ForeignKey("csv_upload_logs.id"), nullable=True)

    # Relationships
    student = relationship("Student", back_populates="engagement_activities")
    upload_batch = relationship("CSVUploadLog")

    def __repr__(self):
        return f"<EngagementActivity student={self.student_id} {self.activity_type}>"
