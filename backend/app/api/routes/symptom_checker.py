from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.rate_limit import limiter, AI_RATE
from app.core.security import get_current_user, AuthenticatedUser
from app.models.schemas import SymptomCheckRequest, SymptomCheckResponse, Severity
from app.services.emergency_detector import detect_emergency, get_emergency_message
from app.services.specialist_mapper import recommend_specialist
from app.services.groq_service import get_symptom_analysis, build_symptom_prompt, GroqAPIError
from app.services import supabase_service

router = APIRouter(prefix="/api/symptom-checker", tags=["symptom-checker"])


@router.post("", response_model=SymptomCheckResponse)
@limiter.limit(AI_RATE)
async def check_symptoms(
    request: Request,
    payload: SymptomCheckRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    match = detect_emergency(payload.symptoms)
    if match.triggered:
        response = SymptomCheckResponse(
            is_emergency=True,
            emergency_message=get_emergency_message(match),
            severity=Severity.emergency,
        )
        await supabase_service.save_symptom_check(
            user.user_id, payload.model_dump(mode="json"), response.model_dump(mode="json")
        )
        return response

    prompt = build_symptom_prompt(payload)
    try:
        analysis = await get_symptom_analysis(prompt)
    except GroqAPIError as exc:
        raise HTTPException(status_code=502, detail=f"AI analysis is temporarily unavailable: {exc}") from exc

    response = SymptomCheckResponse(
        is_emergency=False,
        symptom_summary=analysis.get("symptom_summary"),
        possible_conditions=analysis.get("possible_conditions"),
        severity=analysis.get("severity", "low"),
        lifestyle_suggestions=analysis.get("lifestyle_suggestions"),
        emergency_warnings=analysis.get("emergency_warnings"),
        recommended_specialist=analysis.get("recommended_specialist") or recommend_specialist(payload.symptoms),
    )

    await supabase_service.save_symptom_check(
        user.user_id, payload.model_dump(mode="json"), response.model_dump(mode="json")
    )

    return response
