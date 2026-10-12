from sqlalchemy import Column, Integer, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class ScoreWeightConfig(BaseModel):
    """
    Configurable score dimension weights.
    Only one row has is_active=True at any time.
    Changing weights triggers a full score recomputation.
    """
    __tablename__ = "score_weight_config"

    academic_weight = Column(Float, nullable=False, default=0.30)
    attendance_weight = Column(Float, nullable=False, default=0.20)
    lms_weight = Column(Float, nullable=False, default=0.15)
    engagement_weight = Column(Float, nullable=False, default=0.10)
    skills_weight = Column(Float, nullable=False, default=0.15)
    placement_weight = Column(Float, nullable=False, default=0.10)

    is_active = Column(Boolean, default=True, nullable=False)
    set_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    set_by_user = relationship("User", back_populates="weight_configs")

    def as_dict(self) -> dict:
        return {
            "academic": self.academic_weight,
            "attendance": self.attendance_weight,
            "lms": self.lms_weight,
            "engagement": self.engagement_weight,
            "skills": self.skills_weight,
            "placement": self.placement_weight,
        }

    def __repr__(self):
        return f"<ScoreWeightConfig active={self.is_active}>"
