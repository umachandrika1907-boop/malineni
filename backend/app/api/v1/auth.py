"""
Auth router — HTTP layer only.
All business logic delegated to AuthService.
JWT stored/read exclusively via httpOnly cookies.
"""
from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Response, Cookie, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, get_optional_current_user
from app.core.config import settings
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    UserCreate,
    UserResponse,
    LoginResponse,
    PasswordChangeRequest,
    RefreshTokenRequest,
    RefreshTokenResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])

COOKIE_SETTINGS = dict(
    httponly=True,
    samesite="lax",
    secure=not settings.debug,   # Secure=True in production only
)


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    """Authenticate with email + password. Sets httpOnly JWT cookies on success."""
    user = AuthService.authenticate_user(db, payload.email, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    access_token, refresh_token = AuthService.create_tokens(user)

    # Set access token cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
        **COOKIE_SETTINGS,
    )
    # Set refresh token cookie (7 days), scoped to the refresh endpoint
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=settings.refresh_token_expire_days * 24 * 3600,
        path="/api/v1/auth/refresh",
        **COOKIE_SETTINGS,
    )

    return LoginResponse(
        message="Login successful.",
        user=UserResponse.model_validate(user),
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )


@router.post("/logout")
def logout(
    response: Response,
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Clear JWT cookies. Effectively logs the user out."""
    response.delete_cookie(
        key="access_token",
        path="/",
        httponly=True,
        samesite="lax",
        secure=not settings.debug,
    )
    response.delete_cookie(
        key="refresh_token",
        path="/api/v1/auth/refresh",
        httponly=True,
        samesite="lax",
        secure=not settings.debug,
    )
    return {"message": "Logged out successfully."}


@router.post("/refresh", response_model=RefreshTokenResponse)
def refresh_token(
    response: Response,
    payload: Optional[RefreshTokenRequest] = None,
    refresh_token_cookie: Optional[str] = Cookie(default=None, alias="refresh_token"),
    db: Session = Depends(get_db),
):
    """Issue a new access token using the refresh token cookie or JSON payload."""
    raw_token = (payload.refresh_token if payload and payload.refresh_token else None) or refresh_token_cookie
    if not raw_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token missing.")

    result = AuthService.refresh_access_token(db, raw_token)
    if result is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token.")

    new_access_token, user = result
    response.set_cookie(
        key="access_token",
        value=new_access_token,
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
        **COOKIE_SETTINGS,
    )
    return RefreshTokenResponse(
        message="Token refreshed.",
        access_token=new_access_token,
        token_type="bearer",
        refresh_token=raw_token,
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return UserResponse.model_validate(current_user)


@router.get("/setup-status")
def get_setup_status(db: Session = Depends(get_db)):
    """Check if initial admin bootstrap is needed."""
    user_count = db.query(User).count()
    return {
        "needs_bootstrap": user_count == 0,
        "admin_exists": user_count > 0,
        "total_users": user_count,
    }


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Create a new user account.
    - If no users exist in the system yet (initial setup), allows creating the first ADMIN account.
    - If users exist, allows creating accounts with role ADMIN, FACULTY, COUNSELOR, or STUDENT.
    """
    user_count = db.query(User).count()
    if user_count == 0:
        # Initial bootstrap account must always be an ADMIN
        payload.role = "ADMIN"
    else:
        # Public self-registration cannot create an ADMIN account
        if payload.role == "ADMIN" and (not current_user or current_user.role != "ADMIN"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Public administrator registration is prohibited. Administrator accounts must be provisioned by institutional leadership.",
            )
        if not payload.role:
            payload.role = "STUDENT"

    try:
        user = AuthService.create_user(db, payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    return UserResponse.model_validate(user)


@router.post("/change-password")
def change_password(
    payload: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Change own password."""
    success = AuthService.change_password(db, current_user, payload.current_password, payload.new_password)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect.")
    return {"message": "Password changed successfully."}
