from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime


class InterventionCreate(BaseModel):
    student_id: int
    flag_trigger: Optional[str] = None
    title: str
    description: Optional[str] = None
    priority: str = "MEDIUM"
    due_date: Optional[date] = None


class InterventionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[date] = None
    note: Optional[str] = None     # Appended to history


class InterventionHistoryResponse(BaseModel):
    id: int
    change_type: str
    note: Optional[str]
    previous_values: Optional[str]
    new_values: Optional[str]
    changed_at: datetime
    changed_by_name: Optional[str] = None

    class Config:
        from_attributes = True


class InterventionResponse(BaseModel):
    id: int
    student_id: int
    student_name: Optional[str] = None
    student_id_str: Optional[str] = None
    created_by: int
    creator_name: Optional[str] = None
    flag_trigger: Optional[str]
    title: str
    description: Optional[str]
    status: str
    priority: str
    due_date: Optional[date]
    resolved_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    history: List[InterventionHistoryResponse] = []

    class Config:
        from_attributes = True
