"""
AI Assistant Router — Endpoints for academic study planning and AI student success assistance.
Uses official google-genai SDK via AIService and RAGService.
"""
from typing import Optional, Union
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_optional_current_user
from app.models.user import User
from app.schemas.ai import (
    AIAssistantRequest,
    AIAssistantResponse,
    GenerateActionPlanRequest,
    GenerateActionPlanResponse,
    PolicyQueryRequest,
    PolicyQueryResponse,
    PolicyDocumentDetail,
    TrajectorySimulateRequest,
    TrajectorySimulateResponse,
)
from app.services.ai_service import AIService, AIServiceError
from app.services.rag_service import RAGService

router = APIRouter(prefix="/ai", tags=["AI Assistant"])


@router.post("/ask", response_model=AIAssistantResponse)
def ask_ai_assistant(
    payload: AIAssistantRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Submit an academic study or planning question to the AI Assistant.
    Supports general study questions, schedule planning, and exam readiness advice.
    No protected student records are exposed.
    """
    clean_message = payload.message.strip()
    if not clean_message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question message cannot be empty or blank.",
        )

    try:
        answer, model_used = AIService.ask_study_assistant(
            message=clean_message,
            context_topic=payload.context_topic,
        )

        return AIAssistantResponse(
            success=True,
            answer=answer,
            model=model_used,
            context_topic=payload.context_topic,
        )

    except AIServiceError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.message,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred in AI assistant service: {str(e)}",
        )


@router.post("/generate-action-plan/{student_id}", response_model=GenerateActionPlanResponse)
def generate_student_action_plan(
    student_id: str,
    payload: Optional[GenerateActionPlanRequest] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    RAG-Powered Action Plan Generation:
    1. Analyzes student's multi-dimensional deficiencies (grades, attendance deficit, LMS completion).
    2. Performs semantic similarity retrieval across institutional academic policies and remedial programs.
    3. Assembles prompt and queries Gemini LLM via google-genai to generate a structured 3-week recovery roadmap.
    4. Automatically records an intervention in the database if save_as_intervention is True.
    """
    save_as_intervention = payload.save_as_intervention if payload else True

    try:
        result = RAGService.generate_action_plan(
            db=db,
            student_identifier=student_id,
            current_user=current_user,
            save_as_intervention=save_as_intervention,
        )
        return GenerateActionPlanResponse(**result)

    except AIServiceError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.message,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate recovery action plan: {str(e)}",
        )


@router.post("/policy-query", response_model=PolicyQueryResponse)
def query_institutional_policies(
    payload: PolicyQueryRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Autonomous Institutional Policy & Regulation Copilot (RAG).
    Searches the official university handbook, attendance bylaws, and remedial procedures.
    Synthesizes actionable guidance using Gemini LLM.
    """
    from app.services.rag_service import PolicyKnowledgeStore, PolicyDocument

    store = PolicyKnowledgeStore.get_instance()
    ranked = store.search(payload.query, top_k=payload.top_k)

    policy_cards = []
    policy_context_text = []

    for doc, score in ranked:
        policy_cards.append(
            PolicyDocumentDetail(
                doc_id=doc.doc_id,
                category=doc.category,
                title=doc.title,
                summary=doc.summary,
                content=doc.content,
                contact_lead=doc.contact_lead,
                location=doc.location,
                schedule=doc.schedule,
                relevance_score=round(float(score), 3),
            )
        )
        policy_context_text.append(
            f"[{doc.doc_id}] {doc.title} ({doc.category})\nSummary: {doc.summary}\nFull Policy: {doc.content}\nLead: {doc.contact_lead} | Location: {doc.location} | Hours: {doc.schedule}"
        )

    joined_policies = "\n\n".join(policy_context_text)

    prompt = (
        f"You are the EduSuccessAI Institutional Policy Copilot for University Academic Regulations & Student Success.\n"
        f"Answer the user query accurately and comprehensively using ONLY the following verified institutional policies:\n\n"
        f"{joined_policies}\n\n"
        f"User Query: {payload.query}\n\n"
        f"Provide a clear, authoritative response with section references, concrete eligibility thresholds, and actionable steps for students and advisors."
    )

    try:
        answer, model_used = AIService.ask_study_assistant(
            message=prompt,
            context_topic="University Academic Regulations",
        )
    except Exception:
        # High quality offline deterministic synthesis fallback
        top_doc = ranked[0][0] if ranked else None
        if top_doc:
            answer = (
                f"### Institutional Policy Guidance: {top_doc.title} ({top_doc.doc_id})\n\n"
                f"**Summary:** {top_doc.summary}\n\n"
                f"**Official Provision:** {top_doc.content}\n\n"
                f"- **Designated Officer:** {top_doc.contact_lead}\n"
                f"- **Location & Office Hours:** {top_doc.location} ({top_doc.schedule})\n\n"
                f"Advisors and students must contact the designated office for formal petition reviews."
            )
        else:
            answer = "No matching institutional policies found for your query. Please consult the Dean of Academic Affairs office."
        model_used = "deterministic-rag-synthesis"

    return PolicyQueryResponse(
        success=True,
        query=payload.query,
        answer=answer,
        policies=policy_cards,
        model_used=model_used,
    )


@router.post("/simulate-trajectory", response_model=TrajectorySimulateResponse)
def simulate_trajectory(
    payload: TrajectorySimulateRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    2026/2027 Predictive AI Risk Radar & Trajectory Forecaster (What-If Simulator).
    Dynamically projects composite success scores, debarment hazards, and risk segment shifts.
    """
    def calc_risk(score: float, att: float) -> str:
        if att < 60.0 or score < 40.0:
            return "CRITICAL"
        if att < 75.0 or score < 55.0:
            return "HIGH_RISK"
        if score < 70.0:
            return "MEDIUM_RISK"
        if score < 80.0:
            return "LOW_RISK"
        return "SAFE"

    # Current baseline
    cur_lms = min(100.0, (payload.current_lms_logins / 10.0) * 50.0 + 30.0)
    current_score = round(
        0.40 * payload.current_academics + 0.30 * payload.current_attendance + 0.20 * cur_lms + 0.10 * 60.0,
        1,
    )
    current_risk = calc_risk(current_score, payload.current_attendance)

    # Simulated future
    sim_lms = min(100.0, (payload.simulated_lms_logins / 10.0) * 50.0 + (payload.simulated_assignments_pct * 0.50))
    projected_score = round(
        0.40 * payload.simulated_academics + 0.30 * payload.simulated_attendance + 0.20 * sim_lms + 0.10 * 80.0,
        1,
    )
    projected_risk = calc_risk(projected_score, payload.simulated_attendance)
    delta_score = round(projected_score - current_score, 1)

    # Insights & Milestones
    insights = []
    milestones = []

    if payload.simulated_attendance >= 75.0 and payload.current_attendance < 75.0:
        milestones.append("Attendance crosses mandatory 75% threshold — Clears End-Semester Exam Debarment Notice.")
        insights.append(f"Simulating +{payload.simulated_attendance - payload.current_attendance:.1f}% attendance resolves statutory condonation requirements.")
    elif payload.simulated_attendance < 75.0:
        milestones.append("Attendance remains below 75% — Requires mandatory laboratory makeup hours.")

    if projected_score >= 80.0:
        insights.append(f"Composite score of {projected_score} qualifies for Dean's Academic Honors & Placement Fast-Track.")
        milestones.append("Achieved Safe Harbor status with top tier course mastery.")
    elif projected_score >= 70.0 and current_score < 70.0:
        insights.append(f"Score improvement of +{delta_score} successfully transitions student into Low Risk cohort.")
        milestones.append("Removed from Academic Probation watchlist.")

    if payload.simulated_lms_logins >= 8.0:
        insights.append(f"LMS activity target ({payload.simulated_lms_logins:.0f} logins/wk) restores digital learning engagement to optimal band.")

    if not insights:
        insights.append(f"Simulated plan yields a net score trajectory change of {delta_score:+.1f} points.")
    if not milestones:
        milestones.append("Continue monitoring bi-weekly attendance logs and assignment deadlines.")

    urgency = "LOW"
    if projected_risk in ("CRITICAL", "HIGH_RISK"):
        urgency = "CRITICAL" if projected_risk == "CRITICAL" else "HIGH"
    elif delta_score < 0:
        urgency = "MEDIUM"

    transition = f"{current_risk} ➔ {projected_risk}"
    if current_risk == projected_risk:
        transition = f"{current_risk} (Stabilized)"

    return TrajectorySimulateResponse(
        success=True,
        current_score=current_score,
        current_risk=current_risk,
        projected_score=projected_score,
        projected_risk=projected_risk,
        delta_score=delta_score,
        risk_transition=transition,
        trajectory_insights=insights,
        recovery_milestones=milestones,
        urgency_level=urgency,
    )
