from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class AIAssistantRequest(BaseModel):
    message: str = Field(
        ...,
        min_length=2,
        max_length=2000,
        description="Study or academic planning question for the assistant",
    )
    context_topic: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Optional subject area, e.g. 'Time Management', 'Exam Prep', 'Data Structures'",
    )


class AIAssistantResponse(BaseModel):
    success: bool
    answer: str
    model: str
    context_topic: Optional[str] = None


class GenerateActionPlanRequest(BaseModel):
    save_as_intervention: bool = Field(
        default=True,
        description="Whether to automatically record this action plan as an active intervention in the database",
    )
    custom_notes: Optional[str] = Field(
        default=None,
        description="Optional additional counselor or faculty notes to steer plan focus",
    )


class PolicyMatchItem(BaseModel):
    doc_id: str
    title: str
    category: str
    location: str
    schedule: str
    contact_lead: str


class GenerateActionPlanResponse(BaseModel):
    success: bool
    student_id: int
    student_id_str: str
    student_name: str
    risk_segment: str
    composite_score: Optional[float] = None
    deficiencies: Dict[str, Any]
    retrieved_policies: List[PolicyMatchItem]
    action_plan_markdown: str
    intervention_id: Optional[int] = None
    generated_at: str
    model_used: Optional[str] = None


class PolicyQueryRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=1000, description="Query regarding university policy or regulation")
    top_k: int = Field(default=3, ge=1, le=6)


class PolicyDocumentDetail(BaseModel):
    doc_id: str
    category: str
    title: str
    summary: str
    content: str
    contact_lead: str
    location: str
    schedule: str
    relevance_score: float


class PolicyQueryResponse(BaseModel):
    success: bool
    query: str
    answer: str
    policies: List[PolicyDocumentDetail]
    model_used: str


class TrajectorySimulateRequest(BaseModel):
    student_id_str: Optional[str] = Field(default=None, description="Optional student ID to base current numbers on")
    current_attendance: float = Field(default=68.0, ge=0.0, le=100.0)
    current_academics: float = Field(default=55.0, ge=0.0, le=100.0)
    current_lms_logins: float = Field(default=2.0, ge=0.0, le=50.0)
    simulated_attendance: float = Field(..., ge=0.0, le=100.0)
    simulated_academics: float = Field(..., ge=0.0, le=100.0)
    simulated_lms_logins: float = Field(..., ge=0.0, le=50.0)
    simulated_assignments_pct: float = Field(default=85.0, ge=0.0, le=100.0)


class TrajectorySimulateResponse(BaseModel):
    success: bool
    current_score: float
    current_risk: str
    projected_score: float
    projected_risk: str
    delta_score: float
    risk_transition: str
    trajectory_insights: List[str]
    recovery_milestones: List[str]
    urgency_level: str
