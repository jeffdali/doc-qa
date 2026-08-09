import os
import uuid
import logging
from typing import Annotated
from fastapi import APIRouter, status, UploadFile, Form, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.ingestion_service import IngestionService
from app.domain.schemas import ErrorResponse, IngestResponse, ChunkingStrategy
from app.core.dependencies import EmbeddingDep, VectorStoreDep, CurrentUserDep
from app.core.config import Settings, get_settings
from app.infrastructure.database.models import Document
from app.infrastructure.database.session import get_db

logger = logging.getLogger(__name__)
router = APIRouter()

# Maximum upload size: 15 MB
MAX_UPLOAD_BYTES = 15 * 1024 * 1024


@router.post(
    "",
    response_model=IngestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest a document",
    description="Upload a PDF, TXT, or MD file, store it locally, and ingest it into the vector store and database.",
    responses={
        422: {"model": ErrorResponse, "description": "Validation error"},
        400: {"model": ErrorResponse, "description": "Unsupported file or empty content"},
    },
)
async def ingest_document(
    file: UploadFile,
    empedding_provider: EmbeddingDep,
    vector_store: VectorStoreDep,
    current_user: CurrentUserDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
    document_id: Annotated[str | None, Form()] = None,
    chunking_strategy: Annotated[ChunkingStrategy, Form()] = ChunkingStrategy.RECURSIVE,
    chunk_size: Annotated[int | None, Form()] = None,
    chunk_overlap: Annotated[int | None, Form()] = None,
) -> IngestResponse:
    if not document_id:
        document_id = str(uuid.uuid4())
    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum size of {MAX_UPLOAD_BYTES // (1024*1024)} MB.",
        )

    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty file uploaded.",
        )

    # Check if doc exists in DB
    res = await db.execute(select(Document).where(Document.document_id == document_id))
    existing_doc = res.scalar_one_or_none()
    if existing_doc and existing_doc.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="A document with this ID already exists and belongs to another user.",
        )

    ingestion_service = IngestionService(
        embedding_provider=empedding_provider,
        vector_store=vector_store,
        settings=settings,
    )

    try:
        response = await ingestion_service.ingest_document(
            content=content,
            filename=file.filename or "unknown",
            document_id=document_id,
            chunking_strategy=chunking_strategy,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
        )

        # Save locally to data/ directory
        os.makedirs("data", exist_ok=True)
        local_filename = f"{document_id}_{file.filename or 'document'}"
        local_path = os.path.join("data", local_filename)
        with open(local_path, "wb") as f:
            f.write(content)

        # Save or update Document in PostgreSQL
        if existing_doc:
            existing_doc.filename = file.filename or "unknown"
            existing_doc.file_size = len(content)
            existing_doc.mime_type = file.content_type or "application/octet-stream"
            existing_doc.chunk_count = response.chunks_created
        else:
            doc = Document(
                document_id=document_id,
                filename=file.filename or "unknown",
                file_size=len(content),
                mime_type=file.content_type or "application/octet-stream",
                chunk_count=response.chunks_created,
                user_id=current_user.id,
            )
            db.add(doc)
        await db.commit()

        return response
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Ingestion failed for '%s'", file.filename, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to ingest document: {str(e)}",
        ) from e