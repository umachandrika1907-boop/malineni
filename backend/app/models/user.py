from sqlalchemy import Column, String, Boolean
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class User(BaseModel):
    """System login account. One per person (admin, faculty, counselor, or student)."""
    __tablename__ = "users"

    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)

    # Role: ADMIN | FACULTY | COUNSELOR | STUDENT
    role = Column(String(20), nullable=False, default="STUDENT")

    # For FACULTY role: restricts which students they can see
    department = Column(String(100), nullable=True)

    is_active = Column(Boolean, default=True, nullable=False)

    # Refresh token blacklist (stored as comma-separated JTI strings for simplicity)
    # A full blacklist table would be used in production
    token_version = Column(String(64), nullable=True)

    # Relationships
    student_profile = relationship("Student", back_populates="user", uselist=False)
    uploaded_files = relationship("CSVUploadLog", back_populates="uploader")
    interventions_created = relationship(
        "Intervention", foreign_keys="Intervention.created_by", back_populates="creator"
    )
    weight_configs = relationship("ScoreWeightConfig", back_populates="set_by_user")

    def __repr__(self):
        return f"<User {self.email} [{self.role}]>"
