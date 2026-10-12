"""
RAG Service — Institutional Knowledge Retrieval & AI Recovery Action Plan Advisor.
Retrieves institutional academic policies, remedial coaching schedules, attendance regulations,
and counseling guidelines to generate personalized 3-week student recovery action plans
using the Google Gemini API (google-genai SDK).
"""
import math
import re
import json
import logging
from typing import Dict, List, Optional, Any, Tuple, Union
from datetime import datetime, date, timedelta
from dataclasses import dataclass, field

from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.student import Student
from app.models.success_score import SuccessScore
from app.models.academic_record import AcademicRecord
from app.models.attendance_log import AttendanceLog
from app.models.lms_activity import LMSActivity
from app.models.engagement_activity import EngagementActivity
from app.models.intervention import Intervention, InterventionHistory
from app.models.user import User
from app.services.ai_service import AIService, AIServiceError

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Institutional Policy Document Definitions & Vector Store
# ---------------------------------------------------------------------------

@dataclass
class PolicyDocument:
    doc_id: str
    category: str
    title: str
    summary: str
    content: str
    tags: List[str]
    contact_lead: str
    location: str
    schedule: str
    embedding: Optional[List[float]] = None


# Official Institutional Knowledge Base
INSTITUTIONAL_POLICIES: List[PolicyDocument] = [
    PolicyDocument(
        doc_id="POL-ACAD-01",
        category="ACADEMIC_REMEDIAL",
        title="Undergraduate Remedial Coaching & Academic Probation Guidelines",
        summary="Remedial coaching clinic protocols for students with marks below 50% or GPA below 5.5.",
        content=(
            "Students achieving below 50% in core subjects or semester GPA below 5.5 must attend mandatory "
            "Remedial Coaching Clinics. Sessions focus on high-weightage concepts, past paper walkthroughs, "
            "and continuous assessments. Mandatory minimum 80% attendance in remedial clinics is required for "
            "re-evaluation eligibility. Students must submit bi-weekly problem sets to the remedial coordinator."
        ),
        tags=["academic", "grades", "marks", "failing", "remedial", "coaching", "math", "engineering", "probation"],
        contact_lead="Dr. Arvind Sharma (Dean of Academic Affairs)",
        location="Academic Block B, Room 204",
        schedule="Mondays & Wednesdays, 4:30 PM - 6:00 PM",
    ),
    PolicyDocument(
        doc_id="POL-ATTN-02",
        category="ATTENDANCE_REGULATION",
        title="Institutional Attendance Regulations & Condonation Procedures",
        summary="Strict 75% attendance threshold requirements, condonation petition paths, and debarment warnings.",
        content=(
            "Under University Regulation Section 7.2, minimum 75% overall attendance is mandatory to appear for "
            "End-Semester Examinations. Students between 65% and 74.9% (HIGH RISK) must file a Formal Condonation "
            "Petition with medical/valid documentation and complete 10 hours of supervised laboratory makeup work. "
            "Students below 60% (CRITICAL RISK) are issued Debarment Notices requiring daily biometric check-ins "
            "and weekly faculty advisor verification."
        ),
        tags=["attendance", "absence", "absent", "condonation", "debarment", "shortage", "biometric", "leaves"],
        contact_lead="Prof. Rajeshwari Nair (Chief Attendance Warden)",
        location="Administrative Wing, Room A-112",
        schedule="Daily Office Hours: 10:00 AM - 1:00 PM",
    ),
    PolicyDocument(
        doc_id="POL-LMS-03",
        category="DIGITAL_LEARNING",
        title="LMS Digital Coursework & Asynchronous Recovery Protocols",
        summary="Mandatory completion thresholds for digital lectures, quizzes, and computing center lab hours.",
        content=(
            "Digital LMS modules require a minimum 75% video watch rate and 80% quiz submission rate. "
            "Students lagging behind on modules are automatically enrolled in the Asynchronous Remediation Program. "
            "The Computing Center provides high-speed workstations, offline course caches, and teaching assistant support. "
            "Modular catch-up quizzes are unlocked sequentially upon completing required lecture checkpoints."
        ),
        tags=["lms", "online", "video", "quiz", "modules", "digital", "asynchronous", "computing", "completion"],
        contact_lead="Er. Vikram Mehta (LMS Technical Director)",
        location="Central Computing Center (CC-101)",
        schedule="Daily Extended Hours: 8:00 AM - 9:00 PM",
    ),
    PolicyDocument(
        doc_id="POL-WELL-04",
        category="MENTAL_HEALTH",
        title="Student Counseling, Stress Management & Wellness Support",
        summary="Confidential 1-on-1 counseling, burnout recovery, test anxiety relief, and academic pacing guidance.",
        content=(
            "The Student Wellness Center offers free, confidential counseling sessions for students experiencing "
            "exam anxiety, academic burnout, personal distress, or difficulty adjusting to collegiate workloads. "
            "Certified psychologists assist in constructing manageable study routines, sleep hygiene schedules, "
            "and emotional resilience strategies. Emergency helpline is active 24/7."
        ),
        tags=["counseling", "stress", "mental health", "wellness", "burnout", "anxiety", "mentor", "support"],
        contact_lead="Dr. Priya Sen (Head of Student Well-being)",
        location="Student Life Center, Suite 102",
        schedule="Monday - Friday: 9:30 AM - 5:00 PM (Emergency 24/7)",
    ),
    PolicyDocument(
        doc_id="POL-PEER-05",
        category="PEER_TUTORING",
        title="Peer Tutoring Honor Society & Collaborative Study Labs",
        summary="One-on-one student tutoring by high-achieving senior scholars in STEM and coding subjects.",
        content=(
            "The Student Tutoring Society pairs students needing academic support with vetted senior peer tutors. "
            "Specialized coaching is provided for Data Structures, Calculus, Algorithms, and Core Engineering. "
            "Sessions are collaborative, low-pressure, and emphasize foundational practice problems and code reviews. "
            "Walk-ins are welcomed, but advance slot reservations are recommended."
        ),
        tags=["peer", "tutoring", "tutor", "study group", "seniors", "data structures", "coding", "practice"],
        contact_lead="Student Honor Society Tutor Coordinator",
        location="Central Library, Collaborative Zone Lab 3",
        schedule="Tuesdays & Thursdays: 5:00 PM - 7:30 PM",
    ),
    PolicyDocument(
        doc_id="POL-MENT-06",
        category="MENTORSHIP",
        title="Faculty Mentorship & Mandatory 21-Day Recovery Contract",
        summary="Structured 3-week academic recovery contract, milestone verification, and administrative clearance.",
        content=(
            "When a student enters HIGH_RISK or CRITICAL risk status, a formal 21-Day Academic Recovery Contract "
            "is initiated. Week 1: Diagnostic audit and timetable lock with faculty mentor. Week 2: Mid-term "
            "progress review with attendance logs and assignment proofs. Week 3: Final evaluation and clearance "
            "signing prior to semester exam hall ticket generation. Non-compliance leads to parent-faculty conference."
        ),
        tags=["mentor", "faculty", "action plan", "contract", "21-day", "recovery", "milestone", "clearance"],
        contact_lead="Assigned Department Faculty Mentor",
        location="Department Staff Quarters / Faculty Offices",
        schedule="Weekly By Appointment (Mandatory Check-ins)",
    ),
]


class PolicyKnowledgeStore:
    """
    In-memory semantic vector store for institutional knowledge policies.
    Supports hybrid search: cosine similarity using Gemini embeddings with
    automatic fallback to TF-IDF semantic vector representation.
    """
    _instance: Optional["PolicyKnowledgeStore"] = None

    def __init__(self):
        self.documents = INSTITUTIONAL_POLICIES
        self._vocabulary: List[str] = []
        self._doc_tfidf_vectors: List[List[float]] = []
        self._embeddings_computed = False
        self._build_tfidf_index()

    @classmethod
    def get_instance(cls) -> "PolicyKnowledgeStore":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _tokenize(self, text: str) -> List[str]:
        return [w.lower() for w in re.findall(r"\b[a-zA-Z]{3,}\b", text)]

    def _build_tfidf_index(self):
        """Builds a lightweight TF-IDF index across all policy documents."""
        vocab_set = set()
        doc_tokens = []
        for doc in self.documents:
            tokens = self._tokenize(f"{doc.title} {doc.summary} {doc.content} {' '.join(doc.tags)}")
            doc_tokens.append(tokens)
            vocab_set.update(tokens)

        self._vocabulary = sorted(list(vocab_set))
        num_docs = len(self.documents)

        # Document frequencies
        df = {term: 0 for term in self._vocabulary}
        for tokens in doc_tokens:
            unique_terms = set(tokens)
            for t in unique_terms:
                if t in df:
                    df[t] += 1

        # TF-IDF vectors
        self._doc_tfidf_vectors = []
        for tokens in doc_tokens:
            vec = []
            tf = {t: tokens.count(t) for t in set(tokens)}
            for term in self._vocabulary:
                term_tf = tf.get(term, 0) / (len(tokens) or 1)
                term_idf = math.log((num_docs + 1) / (df.get(term, 0) + 1)) + 1
                vec.append(term_tf * term_idf)
            # Normalize vector
            norm = math.sqrt(sum(x * x for x in vec)) or 1.0
            self._doc_tfidf_vectors.append([x / norm for x in vec])

    def _tfidf_similarity(self, query_text: str) -> List[float]:
        tokens = self._tokenize(query_text)
        if not tokens:
            return [0.0] * len(self.documents)

        q_tf = {t: tokens.count(t) for t in set(tokens)}
        num_docs = len(self.documents)
        q_vec = []
        for term in self._vocabulary:
            tf = q_tf.get(term, 0) / (len(tokens) or 1)
            # Find approximate idf
            idf = math.log((num_docs + 1) / 1.5) + 1
            q_vec.append(tf * idf)

        q_norm = math.sqrt(sum(x * x for x in q_vec)) or 1.0
        q_vec = [x / q_norm for x in q_vec]

        scores = []
        for doc_vec in self._doc_tfidf_vectors:
            dot = sum(a * b for a, b in zip(q_vec, doc_vec))
            scores.append(max(0.0, dot))
        return scores

    def search(self, query: str, top_k: int = 3) -> List[Tuple[PolicyDocument, float]]:
        """
        Retrieves the top_k most relevant policy documents for the given query.
        Tries official Gemini embeddings first; if unavailable, uses TF-IDF similarity.
        """
        scores = None

        # Attempt Gemini embedding retrieval if client is available
        try:
            client = AIService.get_client()
            res = client.models.embed_content(
                model="gemini-embedding-001",
                contents=query,
            )
            if res and hasattr(res, "embeddings") and res.embeddings:
                query_emb = res.embeddings[0].values
                # Compute embeddings for docs lazily if needed
                if not self._embeddings_computed:
                    for doc in self.documents:
                        if doc.embedding is None:
                            d_res = client.models.embed_content(
                                model="gemini-embedding-001",
                                contents=f"{doc.title}. {doc.summary}. {doc.content}",
                            )
                            if d_res and hasattr(d_res, "embeddings") and d_res.embeddings:
                                doc.embedding = d_res.embeddings[0].values
                    self._embeddings_computed = True

                # Compute cosine similarities
                gemini_scores = []
                for doc in self.documents:
                    if doc.embedding and len(doc.embedding) == len(query_emb):
                        dot = sum(a * b for a, b in zip(query_emb, doc.embedding))
                        norm_q = math.sqrt(sum(a * a for a in query_emb)) or 1.0
                        norm_d = math.sqrt(sum(b * b for b in doc.embedding)) or 1.0
                        gemini_scores.append(dot / (norm_q * norm_d))
                    else:
                        gemini_scores.append(0.0)
                scores = gemini_scores
        except Exception as e:
            logger.debug(f"Gemini embedding lookup skipped ({e}); utilizing semantic TF-IDF index.")

        if scores is None:
            scores = self._tfidf_similarity(query)

        # Sort and return top_k
        ranked = sorted(zip(self.documents, scores), key=lambda x: x[1], reverse=True)
        return ranked[:top_k]


# ---------------------------------------------------------------------------
# RAG Student Success Advisor
# ---------------------------------------------------------------------------

class RAGService:
    """
    RAG-Powered Academic Recovery Advisor for EduSuccessAI.
    Combines student metric deficiencies with institutional policy retrieval
    to formulate personalized 3-week recovery plans and counseling notes.
    """

    PRIMARY_MODELS = [
        "gemini-3.5-flash",
        "gemini-3.1-flash-lite",
        "gemini-2.5-flash-lite",
        "gemini-flash-latest",
        "gemini-3.8-flash",
    ]

    @classmethod
    def get_student_deficiencies(cls, db: Session, student_id: int) -> Dict[str, Any]:
        """
        Gathers comprehensive academic, attendance, LMS, and engagement metrics
        for the given student and identifies exact deficient subject areas.
        """
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            return {}

        # Latest score snapshot
        latest_score = (
            db.query(SuccessScore)
            .filter(SuccessScore.student_id == student.id)
            .order_by(desc(SuccessScore.created_at))
            .first()
        )

        # Academic records (focus on current semester or lowest marks)
        academic_records = (
            db.query(AcademicRecord)
            .filter(AcademicRecord.student_id == student.id, AcademicRecord.is_superseded == False)
            .all()
        )
        failing_subjects = []
        low_subjects = []
        all_subjects_summary = []
        for rec in academic_records:
            all_subjects_summary.append(f"{rec.subject_name} ({rec.subject_code}): {rec.percentage:.1f}% [Grade {rec.grade}]")
            if rec.percentage < 50.0 or rec.grade in ("F", "FAIL", "D"):
                failing_subjects.append({
                    "code": rec.subject_code,
                    "name": rec.subject_name,
                    "marks": rec.marks_obtained,
                    "max_marks": rec.max_marks,
                    "percentage": rec.percentage,
                    "grade": rec.grade,
                })
            elif rec.percentage < 65.0:
                low_subjects.append({
                    "code": rec.subject_code,
                    "name": rec.subject_name,
                    "percentage": rec.percentage,
                    "grade": rec.grade,
                })

        # Attendance logs
        attendance_logs = (
            db.query(AttendanceLog)
            .filter(AttendanceLog.student_id == student.id, AttendanceLog.is_superseded == False)
            .all()
        )
        total_classes = len(attendance_logs)
        attended_classes = sum(1 for log in attendance_logs if log.status == "P")
        attendance_pct = (attended_classes / total_classes * 100.0) if total_classes > 0 else 0.0

        # LMS metrics
        lms_records = (
            db.query(LMSActivity)
            .filter(LMSActivity.student_id == student.id)
            .order_by(desc(LMSActivity.created_at))
            .limit(10)
            .all()
        )
        avg_completion = 0.0
        if lms_records:
            avg_completion = sum(getattr(r, "completion_percentage", 0.0) or 0.0 for r in lms_records) / len(lms_records)

        # Engagement
        engagement_records = (
            db.query(EngagementActivity)
            .filter(EngagementActivity.student_id == student.id)
            .all()
        )

        risk_segment = latest_score.risk_segment if latest_score else (
            "CRITICAL" if attendance_pct < 60 or failing_subjects else "SAFE"
        )
        total_score = latest_score.total_score if latest_score else None

        active_flags = []
        if latest_score and latest_score.active_flags:
            try:
                active_flags = json.loads(latest_score.active_flags)
            except Exception:
                active_flags = [str(latest_score.active_flags)]

        if attendance_pct < 75.0 and "LOW_ATTENDANCE" not in active_flags:
            active_flags.append("LOW_ATTENDANCE")
        if failing_subjects and "ACADEMIC_DEFICIT" not in active_flags:
            active_flags.append("ACADEMIC_DEFICIT")

        return {
            "student_id": student.id,
            "student_id_str": student.student_id_str,
            "full_name": student.full_name,
            "department": student.department,
            "program": student.program,
            "semester": student.current_semester,
            "year_of_study": student.year_of_study,
            "composite_score": total_score,
            "risk_segment": risk_segment,
            "active_flags": active_flags,
            "attendance_pct": round(attendance_pct, 1),
            "total_classes": total_classes,
            "attended_classes": attended_classes,
            "missed_classes": total_classes - attended_classes,
            "failing_subjects": failing_subjects,
            "low_subjects": low_subjects,
            "all_subjects_summary": all_subjects_summary,
            "lms_completion_pct": round(avg_completion, 1),
            "engagement_count": len(engagement_records),
        }

    @classmethod
    def retrieve_policies_for_student(cls, student_profile: Dict[str, Any]) -> List[Tuple[PolicyDocument, float]]:
        """
        Formulates an adaptive query reflecting the student's unique deficits
        and performs semantic similarity retrieval from the institutional vector store.
        """
        query_parts = []
        if student_profile.get("attendance_pct", 100.0) < 75.0:
            query_parts.append("attendance shortage condonation debarment makeup classes regulations")

        failing = student_profile.get("failing_subjects", [])
        if failing:
            subject_names = " ".join(s["name"] for s in failing)
            query_parts.append(f"failing marks remedial coaching clinic academic probation peer tutoring {subject_names}")

        if student_profile.get("lms_completion_pct", 100.0) < 60.0:
            query_parts.append("LMS digital coursework asynchronous recovery computing center modules")

        risk = student_profile.get("risk_segment", "")
        if risk in ("HIGH_RISK", "CRITICAL"):
            query_parts.append("faculty mentorship 21-day recovery contract counseling stress wellness support")

        if not query_parts:
            query_parts.append("academic excellence study skills mentorship honors peer tutoring")

        full_query = " ".join(query_parts)
        store = PolicyKnowledgeStore.get_instance()
        return store.search(full_query, top_k=4)

    @classmethod
    def generate_action_plan(
        cls,
        db: Session,
        student_identifier: Union[int, str],
        current_user: Optional[User] = None,
        save_as_intervention: bool = True,
    ) -> Dict[str, Any]:
        """
        Orchestrates end-to-end RAG workflow:
        1. Query deficient student metrics & risk segment.
        2. Semantically retrieve matching institutional policies & remedial schedules.
        3. Assemble contextual prompt and invoke Gemini via google-genai SDK.
        4. Optionally persist resulting recovery plan as an active Intervention record.
        """
        # Resolve student
        student = None
        if isinstance(student_identifier, int) or (isinstance(student_identifier, str) and student_identifier.isdigit()):
            student = db.query(Student).filter(Student.id == int(student_identifier)).first()
        if not student and isinstance(student_identifier, str):
            student = db.query(Student).filter(Student.student_id_str == student_identifier.strip()).first()

        if not student:
            raise AIServiceError(f"Student '{student_identifier}' not found in database.", status_code=404)

        # 1. Deficiencies
        profile = cls.get_student_deficiencies(db, student.id)

        # 2. RAG Retrieval
        retrieved_items = cls.retrieve_policies_for_student(profile)
        matched_docs = [item[0] for item in retrieved_items]

        # Build institutional context snippet
        policies_context = []
        for doc in matched_docs:
            policies_context.append(
                f"- [{doc.doc_id}] {doc.title} ({doc.category})\n"
                f"  Policy Rules: {doc.content}\n"
                f"  Location & Contact: {doc.location} | Lead: {doc.contact_lead}\n"
                f"  Schedule: {doc.schedule}"
            )
        policies_text = "\n\n".join(policies_context)

        # Deficiencies summary string
        failing_names = [f"{s['name']} ({s['percentage']:.1f}%)" for s in profile.get("failing_subjects", [])]
        failing_str = ", ".join(failing_names) if failing_names else "None (Satisfactory academic marks)"

        # 3. Assemble Prompt
        prompt = (
            f"You are the Lead Academic Advisor and Institutional Success Strategist for EduSuccessAI.\n"
            f"Generate an individualized, structured 3-Week Academic Recovery Plan for the following student.\n\n"
            f"=== STUDENT PROFILE ===\n"
            f"- Student ID: {profile['student_id_str']}\n"
            f"- Full Name: {profile['full_name']}\n"
            f"- Department & Program: {profile['department']} ({profile['program']})\n"
            f"- Current Semester: Semester {profile['semester']}, Year {profile['year_of_study']}\n"
            f"- Composite Success Score: {profile['composite_score'] if profile['composite_score'] is not None else 'N/A'}/100\n"
            f"- Risk Band: {profile['risk_segment']}\n"
            f"- Attendance Rate: {profile['attendance_pct']}% ({profile['missed_classes']} classes missed out of {profile['total_classes']})\n"
            f"- Deficient / Failing Subjects: {failing_str}\n"
            f"- LMS Coursework Completion: {profile['lms_completion_pct']}%\n"
            f"- Active Risk Flags: {', '.join(profile.get('active_flags', [])) or 'None'}\n\n"
            f"=== RETRIEVED INSTITUTIONAL POLICIES & PROGRAMS ===\n"
            f"{policies_text}\n\n"
            f"=== INSTRUCTIONS ===\n"
            f"1. Directly cite the retrieved institutional programs (use exact room numbers, schedules, and faculty contacts provided above).\n"
            f"2. Provide a concrete, day-by-day or phased 3-week timeline:\n"
            f"   - Week 1: Immediate Stabilization & Attendance Rectification\n"
            f"   - Week 2: Targeted Academic Coaching & Assignment Catch-up\n"
            f"   - Week 3: Mock Assessments & Final Compliance Verification\n"
            f"3. Include a 'Counselor & Mentor Guidance' section detailing specific advice for the faculty advisor.\n"
            f"4. Specify tangible milestone targets (e.g. required attendance %, assignment submission deadlines).\n"
            f"5. Write in a constructive, empowering, and highly professional tone."
        )

        client = None
        plan_markdown = None
        model_used = None

        try:
            client = AIService.get_client()
            for candidate_model in cls.PRIMARY_MODELS:
                try:
                    response = client.models.generate_content(
                        model=candidate_model,
                        contents=prompt,
                        config=dict(
                            temperature=0.6,
                            system_instruction=(
                                "You are EduSuccessAI's Principal Academic Recovery Advisor. "
                                "Produce comprehensive, authoritative, institutional recovery plans formatted in clean markdown."
                            ),
                        ),
                    )
                    if response and response.text:
                        plan_markdown = response.text.strip()
                        model_used = candidate_model
                        break
                except Exception as model_err:
                    logger.debug(f"Candidate model {candidate_model} failed: {model_err}")
                    continue
        except Exception as e:
            logger.warning(f"Could not initialize AI client ({e}); using deterministic institutional plan generator.")

        # Robust Fallback Plan Generator if all LLM models encounter quota / rate limits
        if not plan_markdown:
            model_used = "deterministic-rule-engine-v1"
            plan_markdown = cls._generate_deterministic_fallback_plan(profile, matched_docs)

        # 4. Optional Persistence into interventions table
        intervention_record = None
        if save_as_intervention:
            try:
                creator_id = current_user.id if current_user else 1
                priority = "HIGH" if profile["risk_segment"] in ("HIGH_RISK", "CRITICAL") else "MEDIUM"
                intervention_record = Intervention(
                    student_id=student.id,
                    created_by=creator_id,
                    flag_trigger=",".join(profile.get("active_flags", [])) or profile["risk_segment"],
                    title=f"AI 3-Week Recovery Plan: {student.full_name} ({profile['risk_segment']})",
                    description=plan_markdown,
                    status="OPEN",
                    priority=priority,
                    due_date=date.today() + timedelta(days=21),
                )
                db.add(intervention_record)
                db.commit()
                db.refresh(intervention_record)

                # Add history entry
                audit_entry = InterventionHistory(
                    intervention_id=intervention_record.id,
                    changed_by=creator_id,
                    change_type="CREATED",
                    new_values=json.dumps({"risk_segment": profile["risk_segment"], "model": model_used}),
                    note="Generated via RAG Institutional Knowledge Advisor.",
                )
                db.add(audit_entry)
                db.commit()
            except Exception as db_err:
                db.rollback()
                logger.error(f"Failed to record intervention in database: {db_err}")

        return {
            "success": True,
            "student_id": student.id,
            "student_id_str": student.student_id_str,
            "student_name": student.full_name,
            "risk_segment": profile["risk_segment"],
            "composite_score": profile["composite_score"],
            "deficiencies": {
                "attendance_pct": profile["attendance_pct"],
                "failing_subjects": profile["failing_subjects"],
                "lms_completion_pct": profile["lms_completion_pct"],
                "active_flags": profile["active_flags"],
            },
            "retrieved_policies": [
                {
                    "doc_id": doc.doc_id,
                    "title": doc.title,
                    "category": doc.category,
                    "location": doc.location,
                    "schedule": doc.schedule,
                    "contact_lead": doc.contact_lead,
                }
                for doc in matched_docs
            ],
            "action_plan_markdown": plan_markdown,
            "intervention_id": intervention_record.id if intervention_record else None,
            "generated_at": datetime.utcnow().isoformat(),
            "model_used": model_used,
        }

    @classmethod
    def _generate_deterministic_fallback_plan(
        cls,
        profile: Dict[str, Any],
        matched_docs: List[PolicyDocument],
    ) -> str:
        """
        Deterministic, institutional fallback plan generator ensuring the platform
        never fails to return a comprehensive 3-week plan even if external LLM quotas are exhausted.
        """
        failing_names = [f"{s['name']} (Score: {s['percentage']:.1f}%)" for s in profile.get("failing_subjects", [])]
        failing_text = ", ".join(failing_names) if failing_names else "General Academic Performance Optimization"
        primary_doc = matched_docs[0] if matched_docs else INSTITUTIONAL_POLICIES[0]
        secondary_doc = matched_docs[1] if len(matched_docs) > 1 else INSTITUTIONAL_POLICIES[1]

        return f"""# Institutional 3-Week Academic Recovery Plan
**Target Student**: {profile['full_name']} ({profile['student_id_str']})  
**Department**: {profile['department']} | Semester {profile['semester']}  
**Risk Segment**: {profile['risk_segment']} (Composite Score: {profile['composite_score'] if profile['composite_score'] is not None else 'N/A'}/100)  
**Primary Focus Areas**: {failing_text} | Attendance: {profile['attendance_pct']}%

---

### Executive Risk Diagnosis
The student currently presents with **{profile['risk_segment']}** status. 
Key deficiency triggers include an attendance rate of **{profile['attendance_pct']}%** (below institutional threshold) 
and identified course subject deficits in **{failing_text}**. LMS activity shows **{profile['lms_completion_pct']}%** module engagement.

---

### Institutional Policy Directives & Program Matching
- **{primary_doc.title} [{primary_doc.doc_id}]**:
  - *Location*: {primary_doc.location}
  - *Schedule*: {primary_doc.schedule}
  - *Coordinator*: {primary_doc.contact_lead}
  - *Directive*: {primary_doc.summary}
- **{secondary_doc.title} [{secondary_doc.doc_id}]**:
  - *Location*: {secondary_doc.location}
  - *Schedule*: {secondary_doc.schedule}
  - *Lead*: {secondary_doc.contact_lead}
  - *Directive*: {secondary_doc.summary}

---

### Phased 3-Week Recovery Schedule

#### **Week 1: Immediate Stabilization & Attendance Rectification**
- **Day 1–2**: Attend mandatory diagnostic conference with department faculty mentor ({secondary_doc.location}). Sign 21-Day Recovery Commitment.
- **Day 3–4**: Submit Formal Condonation and Absence Justification Petition to the Chief Attendance Warden ({primary_doc.location}).
- **Day 5**: Enroll in the Remedial Coaching Clinic for deficient subjects. Begin daily biometric attendance check-in.
- **Milestone 1**: 100% attendance across all scheduled lectures in Week 1; lock down personalized study schedule.

#### **Week 2: Targeted Academic Coaching & Coursework Recovery**
- **Day 8–10**: Attend Remedial Coaching sessions ({primary_doc.schedule}) and Peer Tutoring Labs ({INSTITUTIONAL_POLICIES[4].location}).
- **Day 11–12**: Complete asynchronous LMS module catch-up in Computing Center CC-101. Target 85%+ completion of overdue video lectures.
- **Day 13–14**: Submit draft solutions for missed problem sets and laboratory records to subject instructors.
- **Milestone 2**: Eradicate all pending assignment backlogs; achieve minimum 70% in weekly remedial diagnostic quizzes.

#### **Week 3: Diagnostic Assessments & Final Compliance Clearance**
- **Day 15–17**: Complete standardized Mock Diagnostic Assessments for all deficient subjects under proctored lab conditions.
- **Day 18–19**: Confidential consultation at Student Life Center (Suite 102) for exam anxiety mitigation and study pacing.
- **Day 20–21**: Final verification audit by Department Academic Review Board. Obtain Dean sign-off for semester exam hall ticket issuance.
- **Milestone 3**: Final attendance projected above 75%; composite diagnostic score verified above 65%.

---

### Counselor & Mentor Notes
1. Require weekly progress slips stamped by remedial clinic faculty.
2. Conduct mid-point wellness check-in to monitor academic stress levels.
3. Parental intimation required if any Week 1 milestones are missed.
"""
