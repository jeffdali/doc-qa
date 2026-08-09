from fastapi import Depends, APIRouter
from typing import Annotated
from app.domain.schemas import HealthResponse
from app.core.config import Settings, get_settings

router = APIRouter()


@router.get(
    "",
    response_model=HealthResponse,
    summary="Service health check",
    description="Returns service status and basic runtime information.",
)
async def health(settings: Annotated[Settings, Depends(get_settings)]):
    return HealthResponse(
        status="ok",
        environment=settings.app_env,
        model=settings.ollama_model,
        version="0.1.0",
    )
