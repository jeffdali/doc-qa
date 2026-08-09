from app.domain.schemas import ChunkingStrategy
from app.domain.models import Chunk
import logging
from chonkie import TokenChunker, RecursiveChunker, SemanticChunker, RecursiveRules

logger = logging.getLogger(__name__)


class ChunkingService:
    """
    Split raw texts into domain Chunk objects
    There are three chunking strategies, chosen at call time
    """

    def chunk(
        self,
        text: str,
        document_id: str,
        chunking_strategy: ChunkingStrategy,
        chunk_size: int,
        chunk_overlap: int,
        metadata: dict,
    ) -> list[Chunk]:
        if not text.strip():
            return []

        raw_chunks = self._run_chunker(
            chunking_strategy, text, chunk_size, chunk_overlap
        )
        
        chunks = [
            Chunk(
                id=f"{document_id}_{i}",
                text=chunk_text.text.strip(),
                metadata={
                    "document_id": document_id,
                    "chunk_index": i,
                    "strategy": chunking_strategy.value,
                    **metadata,
                },
            )
            for i, chunk_text in enumerate(raw_chunks)
            if chunk_text.text.strip()
        ]
        logger.info(
            "Chunked document '%s' into %d chunks using strategy '%s'",
            document_id,
            len(chunks),
            chunking_strategy.value,
        )

        return chunks

    def _run_chunker(
        self,
        strategy: ChunkingStrategy,
        text: str,
        chunk_size: int,
        chunk_overlap: int,
    ):

        if strategy == ChunkingStrategy.FIXED:
            return self._fixed_chunks(text, chunk_size, chunk_overlap)
        elif strategy == ChunkingStrategy.RECURSIVE:
            return self._recursive_chunks(text, chunk_size, chunk_overlap)
        elif strategy == ChunkingStrategy.SEMANTIC:
            return self._semantic_chunks(text, chunk_size, chunk_overlap)
        else:
            raise ValueError(f"Unsupported chunking strategy: {strategy}")

    def _fixed_chunks(
        self, text: str, chunk_size: int, chunk_overlap: int
    ) -> list[str]:
        chunker = TokenChunker(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
        )

        return chunker.chunk(text)

    def _recursive_chunks(
        self, text: str, chunk_size: int, chunk_overlap: int
    ) -> list[str]:
        chunker = RecursiveChunker(chunk_size=chunk_size, rules=RecursiveRules())

        return chunker.chunk(text)

    def _semantic_chunks(
        self, text: str, chunk_size: int, chunk_overlap: int
    ) -> list[str]:
        chunker = SemanticChunker(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            threshold=0.5,
            mode="percentile",
        )
        return chunker.chunk(text)
