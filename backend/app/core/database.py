from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from typing import Generator
from app.core.config import settings

# Create SQLAlchemy engine
# For SQLite: enable WAL mode and foreign keys
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {},
    echo=settings.debug,
)

# Enable SQLite foreign keys and WAL journal mode
if "sqlite" in settings.database_url:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all ORM models
Base = declarative_base()


def get_db() -> Generator:
    """FastAPI dependency: yields a database session and closes it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Create all tables defined in ORM models. Called on application startup."""
    # Import all models so SQLAlchemy registers them before creating tables
    from app.models import (  # noqa: F401
        user, student, academic_record, attendance_log,
        lms_activity, engagement_activity, skill_assessment,
        placement_record, feedback, success_score,
        intervention, csv_upload_log, score_weight_config
    )
    Base.metadata.create_all(bind=engine)
