from typing import runtime_checkable
from typing import Protocol, AsyncGenerator
from app.domain.models import Chunk, SearchResult


@runtime_checkable
class RerankerProvider(Protocol):
    def rerank(self, query: str, results: list[SearchResult], top_k: int) -> list[SearchResult]: ...

@runtime_checkable
class EmbeddingProvider(Protocol):
    def embed_text(self, text: str) -> list[float]: ...

    def embed_batch(self, texts: list[str]) -> list[list[float]]: ...

    @property
    def dimension(self) -> int: ...


@runtime_checkable
class VectorStoreRepository(Protocol):
    def add_chunks(self, chunks: list[Chunk]) -> None: ...

    def search(
        self, query_embedding: list[float], top_k: int, document_ids: list[str] | None = None
    ) -> list[SearchResult]: ...

    def delete_document(self, document_id: str) -> None: ...

    def collection_size(self) -> int:
        """return total number of chunks in the store"""
        ...

class LLMProvider(Protocol):
    """
        Any LLm Implementation must satisfy this protocol
    """
    
    async def complete(self, prompt:str, system_prompt: str | None=None, temperature: float=0.0)-> str:
        ...
        
    
    async def stream(self, prompt:str, system_prompt: str | None=None, temperature: float=0.0) -> AsyncGenerator[str, None]:
        ...
    