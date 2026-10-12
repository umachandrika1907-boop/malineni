"""
Models package — import all models here so SQLAlchemy registers them
before Base.metadata.create_all() is called.
"""
from app.models.user import User
from app.models.student import Student
from app.models.academic_record import AcademicRecord
from app.models.attendance_log import AttendanceLog
from app.models.lms_activity import LMSActivity
from app.models.engagement_activity import EngagementActivity
from app.models.skill_assessment import SkillAssessment
from app.models.placement_record import PlacementRecord
from app.models.feedback import Feedback
from app.models.success_score import SuccessScore
from app.models.intervention import Intervention, InterventionHistory
from app.models.csv_upload_log import CSVUploadLog
from app.models.score_weight_config import ScoreWeightConfig

__all__ = [
    "User", "Student", "AcademicRecord", "AttendanceLog", "LMSActivity",
    "EngagementActivity", "SkillAssessment", "PlacementRecord", "Feedback",
    "SuccessScore", "Intervention", "InterventionHistory",
    "CSVUploadLog", "ScoreWeightConfig",
]
