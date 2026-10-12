"""Shared base model with id, created_at, and updated_at columns."""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, DateTime
from app.core.database import Base


class TimestampMixin:
    """Adds created_at and updated_at to any model."""
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class BaseModel(Base, TimestampMixin):
    """Abstract base for all ORM models."""
    __abstract__ = True
    id = Column(Integer, primary_key=True, autoincrement=True)
