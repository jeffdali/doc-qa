from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from datetime import datetime
from app.core.dependencies import CurrentUserDep
from app.domain.schemas import ChatMessageCreate, ChatMessageResponse, PaginatedChatMessageResponse
from app.infrastructure.database.models import ChatMessage, Document
from app.infrastructure.database.session import get_db

router = APIRouter()


async def verify_document_ownership(
    document_id: str, current_user: CurrentUserDep, db: AsyncSession
) -> Document:
    result = await db.execute(
        select(Document).where(Document.document_id == document_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Document not found"
        )
    if doc.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this document's chat",
        )
    return doc


@router.get(
    "/{document_id}/messages",
    response_model=PaginatedChatMessageResponse,
    summary="Get chat history for a document",
)
async def get_messages(
    document_id: str,
    current_user: CurrentUserDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    cursor: str | None = None,
    limit: int = 50,
) -> PaginatedChatMessageResponse:
    await verify_document_ownership(document_id, current_user, db)

    query = select(ChatMessage).where(ChatMessage.document_id == document_id)

    if cursor:
        try:
            cursor_dt = datetime.fromisoformat(cursor)
            query = query.where(ChatMessage.created_at < cursor_dt)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid cursor format"
            )

    result = await db.execute(
        query.order_by(ChatMessage.created_at.desc()).limit(limit)
    )
    messages = result.scalars().all()
    
    next_cursor = None
    if len(messages) == limit and messages[-1].created_at:
        next_cursor = messages[-1].created_at.isoformat()
        
    messages.reverse()

    items = [
        ChatMessageResponse(
            id=str(m.id),
            role=m.role,
            content=m.content,
            sources=m.sources or [],
            created_at=m.created_at.isoformat() if m.created_at else None,
        )
        for m in messages
    ]
    return PaginatedChatMessageResponse(items=items, next_cursor=next_cursor)


@router.post(
    "/{document_id}/messages",
    response_model=ChatMessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Save a chat message",
)
async def create_message(
    document_id: str,
    message_in: ChatMessageCreate,
    current_user: CurrentUserDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ChatMessageResponse:
    await verify_document_ownership(document_id, current_user, db)

    message = ChatMessage(
        document_id=document_id,
        role=message_in.role,
        content=message_in.content,
        sources=message_in.sources or [],
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)

    return ChatMessageResponse(
        id=str(message.id),
        role=message.role,
        content=message.content,
        sources=message.sources or [],
        created_at=message.created_at.isoformat() if message.created_at else None,
    )


@router.delete(
    "/{document_id}/messages",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Clear chat history for a document",
)
async def clear_messages(
    document_id: str,
    current_user: CurrentUserDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    await verify_document_ownership(document_id, current_user, db)

    await db.execute(
        delete(ChatMessage).where(ChatMessage.document_id == document_id)
    )
    await db.commit()
