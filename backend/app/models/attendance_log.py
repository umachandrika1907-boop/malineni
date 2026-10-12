from sqlalchemy import Column, String, Integer, Boolean, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class AttendanceLog(BaseModel):
    """One row = one daily attendance event per student per subject."""
    __tablename__ = "attendance_log"

    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_code = Column(String(20), nullable=False)
    date = Column(Date, nullable=False)
    semester = Column(Integer, nullable=False)

    # P = Present, A = Absent, L = Leave
    status = Column(String(1), nullable=False)

    is_superseded = Column(Boolean, default=False, nullable=False)
    upload_batch_id = Column(Integer, ForeignKey("csv_upload_logs.id"), nullable=True)

    # Relationships
    student = relationship("Student", back_populates="attendance_logs")
    upload_batch = relationship("CSVUploadLog")

    __table_args__ = (
        UniqueConstraint("student_id", "subject_code", "date", "is_superseded",
                         name="uq_attendance_log"),
    )

    def __repr__(self):
        return f"<AttendanceLog student={self.student_id} {self.date} {self.status}>"
