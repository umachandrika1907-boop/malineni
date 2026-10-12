"""
AI Service — Integration with Google Gemini using the official google-genai SDK.
Handles client initialization, prompt engineering, system instructions, and error handling.
"""
from typing import Optional, Tuple
from google import genai
from google.genai import errors

from app.core.config import settings


class AIServiceError(Exception):
    """Custom exception for AI service errors with HTTP-ready status code and message."""
    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class AIService:
    # Highly available primary model and fallback models for high-demand spikes
    PRIMARY_MODEL = "gemini-3.5-flash"
    FALLBACK_MODELS = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"]

    SYSTEM_INSTRUCTION = (
        "You are EduSuccessAI's Academic Success & Study Skills Advisor. "
        "Your mission is to help higher-education students succeed by providing evidence-based study strategies, "
        "time management schedules, exam preparation roadmaps, and conceptual learning guidance. "
        "\n\nRules and Guardrails:\n"
        "1. Provide encouraging, practical, and highly actionable advice formatted with clear headings or bullet points.\n"
        "2. Strictly focus on academic skills, study planning, time allocation, learning techniques (such as active recall, spaced repetition, Pomodoro), and general coursework comprehension.\n"
        "3. NEVER fabricate, hallucinate, or assume private student performance data, exam marks, or student identities.\n"
        "4. If asked about personal student records, explain that personal performance analytics are available directly on the Student Performance Dashboard.\n"
        "5. Keep responses concise, clear, and relevant to the student's question."
    )

    _client: Optional[genai.Client] = None

    @classmethod
    def get_client(cls) -> genai.Client:
        """
        Returns or initializes the google-genai Client using the configured API key.
        Raises AIServiceError if API key is missing.
        """
        api_key = settings.gemini_api_key
        if not api_key or not api_key.strip():
            raise AIServiceError(
                "Gemini API key is not configured. Please set GEMINI_API_KEY in the backend environment.",
                status_code=503,
            )

        if cls._client is None:
            cls._client = genai.Client(
                api_key=api_key.strip(),
                http_options=dict(timeout=15000),
            )
        return cls._client

    @classmethod
    def ask_study_assistant(
        cls,
        message: str,
        context_topic: Optional[str] = None,
    ) -> Tuple[str, str]:
        """
        Sends a query to Gemini with automatic fallback on temporary server spikes.
        Returns (answer, model_name).
        """
        clean_message = message.strip()
        if len(clean_message) < 2:
            raise AIServiceError("The question is too short. Please provide more detail.", status_code=400)

        client = cls.get_client()

        # Build prompt with optional context
        prompt_parts = []
        if context_topic and context_topic.strip():
            prompt_parts.append(f"Subject / Topic Area: {context_topic.strip()}\n")
        prompt_parts.append(f"Student Question: {clean_message}")
        full_prompt = "\n".join(prompt_parts)

        models_to_try = [cls.PRIMARY_MODEL] + [m for m in cls.FALLBACK_MODELS if m != cls.PRIMARY_MODEL]
        last_error = None

        for model_name in models_to_try:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=full_prompt,
                    config=dict(
                        system_instruction=cls.SYSTEM_INSTRUCTION,
                        temperature=0.7,
                    ),
                )

                if response and response.text:
                    return response.text.strip(), model_name

            except errors.ClientError as err:
                status_code = getattr(err, "code", 400)
                if status_code in (401, 403):
                    raise AIServiceError(
                        "Authentication failed with the Gemini API. Please verify the backend GEMINI_API_KEY configuration.",
                        status_code=502,
                    )
                last_error = err
                continue

            except Exception as err:
                last_error = err
                continue

        # If all candidate models were exhausted
        err_str = str(last_error) if last_error else "Service unavailable"
        if any(marker in err_str for marker in ("503", "504", "UNAVAILABLE", "DEADLINE_EXCEEDED", "high demand", "timed out")):
            raise AIServiceError(
                "The Gemini AI service is currently experiencing high demand. Please try again in a few moments.",
                status_code=503,
            )
        raise AIServiceError(
            f"An error occurred while communicating with the AI service: {err_str}",
            status_code=502,
        )
