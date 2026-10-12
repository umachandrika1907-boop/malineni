from sqlalchemy import Column, String, Integer, Boolean, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class LMSActivity(BaseModel):
    """Aggregated weekly LMS engagement per student per course."""
    __tablename__ = "lms_activity"

    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    course_name = Column(String(200), nullable=False)
    week_start_date = Column(Date, nullable=False)  # Monday of the recorded week

    logins = Column(Integer, default=0, nullable=False)
    assignments_submitted = Column(Integer, default=0, nullable=False)
    assignments_total = Column(Integer, default=0, nullable=False)
    videos_watched = Column(Integer, default=0, nullable=False)
    forum_posts = Column(Integer, default=0, nullable=False)
    quiz_attempts = Column(Integer, default=0, nullable=False)

    is_superseded = Column(Boolean, default=False, nullable=False)
    upload_batch_id = Column(Integer, ForeignKey("csv_upload_logs.id"), nullable=True)

    # Relationships
    student = relationship("Student", back_populates="lms_activities")
    upload_batch = relationship("CSVUploadLog")

    __table_args__ = (
        UniqueConstraint("student_id", "course_name", "week_start_date", "is_superseded",
                         name="uq_lms_activity"),
    )

    def __repr__(self):
        return f"<LMSActivity student={self.student_id} {self.course_name} week={self.week_start_date}>"
