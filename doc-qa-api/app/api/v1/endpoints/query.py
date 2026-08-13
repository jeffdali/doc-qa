import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUserDep, RAGServiceDep
from app.domain.schemas import (
    QueryRequest,
    RAGResponse,
    RAGStreamChunk,
)
from app.infrastructure.database.session import get_db
from app.infrastructure.database.models import Document, User, ChatMessage
from app.domain.schemas import ChatTurn
logger = logging.getLogger(__name__)
router = APIRouter()


async def enforce_query_ownership(
    request: QueryRequest, current_user: User, db: AsyncSession
) -> None:
    if request.document_ids:
        res = await db.execute(
            select(Document.document_id).where(
                Document.document_id.in_(request.document_ids),
                Document.user_id == current_user.id,
            )
        )
        valid_ids = set(res.scalars().all())
        if len(valid_ids) != len(set(request.document_ids)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="One or more requested documents do not belong to you or do not exist.",
            )
    else:
        res = await db.execute(
            select(Document.document_id).where(Document.user_id == current_user.id)
        )
        user_doc_ids = res.scalars().all()
        request.document_ids = list(user_doc_ids)

async def inject_chat_history(
    request: QueryRequest, db: Annotated[AsyncSession, Depends(get_db)])-> None:
    if not request.document_ids:
        request.chat_history = []
        return
    
    res = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.document_id == request.document_ids[0])
        .order_by(ChatMessage.created_at.desc())
        .limit(6)
    )
    
    db_messages = reversed(res.scalars().all())
    
    # Overwrite whatever the client sent with the real DB state
    request.chat_history = [
        ChatTurn(role=m.role, content=m.content) 
        for m in db_messages
    ]

@router.post(
    "",
    response_model=RAGResponse,
    summary="Ask a question",
    description=(
        "Retrieves relevant document chunks and generates a grounded answer. "
        "Returns the full answer with source citations. Strictly isolates by user ownership."
    ),
)
async def query(
    request: QueryRequest,
    rag_service: RAGServiceDep,
    current_user: CurrentUserDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RAGResponse:
    await enforce_query_ownership(request, current_user, db)
    await inject_chat_history(request, db)
    try:
        return await rag_service.answer(request)
    except RuntimeError as exc:
        logger.error("LLM call failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except HTTPException:
        raise


@router.post(
    "/stream",
    summary="Ask a question (streaming)",
    description=(
        "Same as /query but streams tokens via Server-Sent Events (SSE) "
        "as they are generated. Use for real-time UI rendering."
    ),
    response_class=StreamingResponse,
)
async def query_stream(
    request: QueryRequest,
    rag_service: RAGServiceDep,
    current_user: CurrentUserDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StreamingResponse:
    await enforce_query_ownership(request, current_user, db)
    await inject_chat_history(request, db)

    async def event_generator():
        try:
            async for chunk in rag_service.stream(request):
                payload = RAGStreamChunk(
                    token=chunk.token,
                    done=chunk.done,
                    sources=chunk.sources,
                )
                yield f"data: {payload.model_dump_json()}\n\n"
        except RuntimeError as exc:
            logger.error("LLM stream failed: %s", exc)
            error_chunk = RAGStreamChunk(token=f"Error: {exc}", done=True)
            yield f"data: {error_chunk.model_dump_json()}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )