"""
EduSuccess AI - Main FastAPI Application

Entry point for the backend application configuring CORS, database initialization,
health check, and API v1 routers.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import create_tables
from app.api.v1.auth import router as auth_router
from app.api.v1.students import router as students_router
from app.api.v1.ai import router as ai_router
from app.api.v1.data import router as data_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager.
    Initializes database tables on startup and bootstraps initial admin if configured.
    """
    create_tables()

    # Optional initial admin bootstrap via environment variables
    if settings.initial_admin_email and settings.initial_admin_password:
        from app.core.database import SessionLocal
        from app.models.user import User
        from app.core.security import hash_password

        db = SessionLocal()
        try:
            email_clean = settings.initial_admin_email.strip()
            existing = db.query(User).filter(User.email == email_clean).first()
            if not existing:
                new_admin = User(
                    email=email_clean,
                    hashed_password=hash_password(settings.initial_admin_password.strip()),
                    role="ADMIN",
                    is_active=True,
                )
                db.add(new_admin)
                db.commit()
            else:
                existing.hashed_password = hash_password(settings.initial_admin_password.strip())
                existing.role = "ADMIN"
                existing.is_active = True
                db.commit()
        except Exception:
            pass
        finally:
            db.close()

    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="EduSuccess AI - Student Success & Early Intervention Platform Backend API",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
origins = [
    settings.frontend_url,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://edus-1150d.web.app",
    "https://edus-1150d.firebaseapp.com",
    "https://edusuccess-api.loca.lt",
]
# Deduplicate while preserving order and strip trailing slashes
unique_origins = list(dict.fromkeys([origin.rstrip("/") for origin in origins if origin]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=unique_origins,
    allow_origin_regex=r"https://(edus-1150d\.(web\.app|firebaseapp\.com)|.*\.loca\.lt)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint to verify backend service status."""
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": settings.app_version,
    }


@app.get("/", tags=["Root"])
def root():
    """Root endpoint welcoming clients and directing to API documentation."""
    return {
        "message": f"Welcome to {settings.app_name} API",
        "version": settings.app_version,
        "docs_url": "/docs",
        "health": "/health",
    }


# Register API v1 Routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(students_router, prefix="/api/v1")
app.include_router(ai_router, prefix="/api/v1")
app.include_router(data_router, prefix="/api/v1")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
