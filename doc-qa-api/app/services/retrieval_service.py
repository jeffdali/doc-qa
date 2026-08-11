from app.repositories.protocols import VectorStoreRepository
from app.repositories.protocols import EmbeddingProvider
import logging

from app.domain.models import SearchResult
from app.domain.schemas import QueryRequest, RetrievalResult

logger = logging.getLogger(__name__)


class RetrievalService:
    def __init__(self, embedding_provider: EmbeddingProvider, vector_store:VectorStoreRepository, reranker = None, default_top_k:int=5):
        self._embedder = embedding_provider
        self._store = vector_store
        self._default_top_k = default_top_k
        self._reranker = reranker
        
    
    def retrieve(self, request: QueryRequest) -> RetrievalResult:
        top_k = request.top_k or self._default_top_k
        fetch_k = max(top_k * 3, 15)
        logger.info("Embedding query: '%s'", request.question[:80])
        
        # Embed the question
        query_vector = self._embedder.embed_text(request.question)
        
        # Search the vestor store
        raw_results = self._store.search(
            query_embedding=query_vector, top_k=fetch_k, document_ids=request.document_ids
        )
        logger.info(
            "Vector search returned %d candidates (fetch_k=%d)",
            len(raw_results),
            fetch_k,
        )
        
        #  Filter by min score
        filtered = self._filter_by_score(raw_results, request.min_score)

        logger.info(
            "Filtered from %d -> %d chunks (min_score=%.2f)",
            len(raw_results),
            len(filtered),
            request.min_score,
        )
        if not filtered:
            logger.warning(
                "No chunks passed the score threshold of %.2f "
                "for question: '%s'",
                request.min_score,
                request.question[:80],
            )
        
        if self._reranker is not None and filtered:
            ranked = self._reranker.rerank(query=request.question, results=filtered, top_k=top_k,)
        else:
            ranked = self._rank(filtered)
        truncated = ranked[:top_k]
        
        return RetrievalResult(
            result=truncated,
            question=request.question,
            total_retrieved=len(raw_results),
            total_after_filter=len(filtered),
            min_score_used=request.min_score,
        )
        
    
    def _filter_by_score(self, results: list[SearchResult], min_score: float) -> list[SearchResult]:
        return [r for r in results if r.score >= min_score]
    
    
    def _rank(self, results: list[SearchResult]) -> list[SearchResult]:
        
        return sorted(results, key= lambda r: r.score, reverse=True)
    