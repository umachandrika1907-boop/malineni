from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator


VALID_ROLES = {"ADMIN", "FACULTY", "COUNSELOR", "STUDENT"}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenData(BaseModel):
    """Decoded JWT payload."""
    sub: str        # user id as string
    role: str
    type: str       # "access" or "refresh"


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(
        ...,
        min_length=8,
        max_length=72,
        description="Password must be between 8 and 72 characters",
    )
    role: str = Field(
        "STUDENT",
        description="Role: ADMIN, FACULTY, COUNSELOR, or STUDENT",
    )
    department: Optional[str] = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        role_upper = v.strip().upper()
        if role_upper not in VALID_ROLES:
            raise ValueError(f"Invalid role '{v}'. Allowed roles: {', '.join(sorted(VALID_ROLES))}")
        return role_upper

    @field_validator("password")
    @classmethod
    def validate_password_bytes(cls, v: str) -> str:
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password cannot exceed 72 bytes due to bcrypt limitation.")
        return v


class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    department: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    message: str
    user: UserResponse
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_type: Optional[str] = "bearer"


class RefreshTokenRequest(BaseModel):
    refresh_token: Optional[str] = None


class RefreshTokenResponse(BaseModel):
    message: str
    access_token: str
    token_type: str = "bearer"
    refresh_token: Optional[str] = None


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(
        ...,
        min_length=8,
        max_length=72,
        description="New password must be between 8 and 72 characters",
    )

    @field_validator("new_password")
    @classmethod
    def validate_new_password_bytes(cls, v: str) -> str:
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password cannot exceed 72 bytes due to bcrypt limitation.")
        return v

