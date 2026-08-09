import os
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUserDep, VectorStoreDep
from app.domain.schemas import DocumentResponse
from app.infrastructure.database.models import Document
from app.infrastructure.database.session import get_db

router = APIRouter()


@router.get(
    "",
    response_model=list[DocumentResponse],
    summary="List current user documents",
)
async def list_documents(
    current_user: CurrentUserDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[DocumentResponse]:
    result = await db.execute(
        select(Document)
        .where(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc())
    )
    docs = result.scalars().all()
    return [
        DocumentResponse(
            id=str(d.id),
            document_id=d.document_id,
            filename=d.filename,
            file_size=d.file_size,
            mime_type=d.mime_type,
            chunk_count=d.chunk_count,
            created_at=d.created_at.isoformat() if d.created_at else None,
        )
        for d in docs
    ]


@router.delete(
    "/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a document",
)
async def delete_document(
    document_id: str,
    current_user: CurrentUserDep,
    vector_store: VectorStoreDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
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
            detail="You do not have permission to delete this document",
        )

    # Delete from Vector Store
    try:
        vector_store.delete_document(document_id)
    except Exception:
        # Log or ignore if already missing from chroma
        pass

    # Clean up local file if exists
    local_path = os.path.join("data", f"{document_id}_{doc.filename}")
    if os.path.exists(local_path):
        try:
            os.remove(local_path)
        except OSError:
            pass

    # Delete from PostgreSQL (cascade will delete chat messages)
    await db.delete(doc)
    await db.commit()
