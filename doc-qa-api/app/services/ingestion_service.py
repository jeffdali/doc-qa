import logging

from app.core.config import Settings
from app.repositories.protocols import EmbeddingProvider, VectorStoreRepository
from app.infrastructure.parsing.document_parser import DocumentParser
from app.infrastructure.chunking.chunking_service import ChunkingService
from app.domain.models import Chunk
from app.domain.schemas import ChunkingStrategy, IngestResponse


logger = logging.getLogger(__name__)


class IngestionService:
    """
    Orchestrates the full document ingestion pipeline.
    it calls the parser, the chunker, the embeeder, the storage and updates status on the database
    """

    def __init__(
        self,
        embedding_provider: EmbeddingProvider,
        vector_store: VectorStoreRepository,
        settings: Settings
    ) -> None:

        self._embedder = embedding_provider
        self._store =vector_store
        self._settings = settings
        self._parser = DocumentParser()
        self._chunker = ChunkingService()
        
    
    async def ingest_document(
        self,
        content: bytes,
        filename:str,
        document_id:str,
        chunking_strategy: ChunkingStrategy = ChunkingStrategy.RECURSIVE,
        chunk_size: int | None = None,
        chunk_overlap: int | None = None,
        metadata: dict | None = None,
        
    ) -> IngestResponse:
        """
            Full pipeline: parse → chunk → embed → store
        """

        effective_chunk_size = chunk_size or self._settings.chunk_size
        effective_overlap = chunk_overlap or self._settings.chunk_overlap
        
        logger.info("Parsing document '%s' (id=%s)", filename, document_id)
        text = self._parser.parse(content, filename)        
        if not text.strip():
            raise ValueError(f"Document '{filename}' produced no extractable text.")

        # Chunking
        chunks = self._chunker.chunk(
            text=text,
            document_id=document_id,
            chunking_strategy=chunking_strategy,
            chunk_size=effective_chunk_size,
            chunk_overlap=effective_overlap,
            metadata={"filename": filename, **(metadata or {})},
        )
        if not chunks:
            raise ValueError(f"Document '{filename}' produced no chunks.")

        # Embedding
        logger.info("Embedding %d chunks...", len(chunks))
        texts = [chunk.text for chunk in chunks]
        embeddings = self._embedder.embed_batch(texts)
        
        embedded_chunks = [
            chunk.model_copy(update={"embedding": embedding}) for chunk, embedding in zip(chunks, embeddings)
        ]

        # Store
        logger.info("Storing %d embedded chunks...", len(embedded_chunks))
        self._store.add_chunks(embedded_chunks)
        
        return IngestResponse(
            document_id=document_id,
            filename=filename,
            chunks_created=len(embedded_chunks),
            chunking_strategy=chunking_strategy,
            message=f"Successfully ingested '{filename}' into {len(embedded_chunks)} chunks.",
        )


        