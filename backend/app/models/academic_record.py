from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class AcademicRecord(BaseModel):
    """One row = one subject result for one student in one semester."""
    __tablename__ = "academic_records"

    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_code = Column(String(20), nullable=False)
    subject_name = Column(String(200), nullable=False)
    semester = Column(Integer, nullable=False)
    academic_year = Column(String(10), nullable=False)  # e.g. "2025-26"
    marks_obtained = Column(Float, nullable=False)
    max_marks = Column(Float, nullable=False, default=100.0)
    percentage = Column(Float, nullable=False)  # Stored at ingestion: (marks/max)*100
    grade = Column(String(5), nullable=False)

    # Superseded rows kept when re-uploads correct data
    is_superseded = Column(Boolean, default=False, nullable=False)
    upload_batch_id = Column(Integer, ForeignKey("csv_upload_logs.id"), nullable=True)

    # Relationships
    student = relationship("Student", back_populates="academic_records")
    upload_batch = relationship("CSVUploadLog")

    __table_args__ = (
        UniqueConstraint("student_id", "subject_code", "semester", "academic_year", "is_superseded",
                         name="uq_academic_record"),
    )

    def __repr__(self):
        return f"<AcademicRecord student={self.student_id} {self.subject_code} S{self.semester}>"
