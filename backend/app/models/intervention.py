from sqlalchemy import Column, String, Integer, Text, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Intervention(BaseModel):
    """Support action created for a student by faculty, counselor, or admin."""
    __tablename__ = "interventions"

    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    # The flag that triggered this intervention, e.g. "LOW_ATTENDANCE"
    flag_trigger = Column(String(30), nullable=True)

    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)

    # OPEN | IN_PROGRESS | RESOLVED | DISMISSED
    status = Column(String(20), nullable=False, default="OPEN")

    # LOW | MEDIUM | HIGH
    priority = Column(String(10), nullable=False, default="MEDIUM")

    due_date = Column(Date, nullable=True)
    resolved_at = Column(DateTime, nullable=True)

    # Relationships
    student = relationship("Student", foreign_keys=[student_id], back_populates="interventions")
    creator = relationship("User", foreign_keys=[created_by], back_populates="interventions_created")
    history = relationship("InterventionHistory", back_populates="intervention", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Intervention student={self.student_id} [{self.status}] {self.title[:30]}>"


class InterventionHistory(BaseModel):
    """
    Append-only audit trail for every change made to an intervention.
    Every status change, note addition, or update creates one row here.
    """
    __tablename__ = "intervention_history"

    intervention_id = Column(Integer, ForeignKey("interventions.id", ondelete="CASCADE"), nullable=False, index=True)
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    # CREATED | UPDATED | NOTE_ADDED | RESOLVED | DISMISSED
    change_type = Column(String(30), nullable=False)

    # JSON snapshot of changed fields (before and after)
    previous_values = Column(Text, nullable=True)
    new_values = Column(Text, nullable=True)

    # Free-text note added at this step
    note = Column(Text, nullable=True)

    # Relationships
    intervention = relationship("Intervention", back_populates="history")
    changed_by_user = relationship("User")

    def __repr__(self):
        return f"<InterventionHistory intervention={self.intervention_id} [{self.change_type}]>"
