from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class CSVUploadLog(BaseModel):
    """Audit record for every CSV file upload attempt."""
    __tablename__ = "csv_upload_logs"

    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    # ACADEMIC | ATTENDANCE | LMS | SKILLS | PLACEMENT | ENGAGEMENT | FEEDBACK
    data_type = Column(String(30), nullable=False)

    file_name = Column(String(255), nullable=False)
    row_count = Column(Integer, nullable=False, default=0)       # Total rows in file
    rows_imported = Column(Integer, nullable=False, default=0)
    rows_rejected = Column(Integer, nullable=False, default=0)

    # PROCESSING | SUCCESS | PARTIAL | FAILED
    status = Column(String(20), nullable=False, default="PROCESSING")

    # JSON list of row-level error objects: [{row: 5, error: "Invalid student_id"}]
    error_summary = Column(Text, nullable=True)

    completed_at = Column(DateTime, nullable=True)

    # Relationships
    uploader = relationship("User", back_populates="uploaded_files")

    def __repr__(self):
        return f"<CSVUploadLog {self.data_type} [{self.status}] by user={self.uploaded_by}>"
