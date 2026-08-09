import glob
import logging
import os
from typing import AsyncGenerator

from app.core.config import Settings
from app.domain.schemas import (
    QueryRequest,
    RAGResponse,
    RAGStreamChunk,
    SourceChunk,
)
from app.infrastructure.llm.prompt_builder import PromptBuilder
from app.repositories.protocols import EmbeddingProvider, LLMProvider, VectorStoreRepository
from app.services.retrieval_service import RetrievalService

logger = logging.getLogger(__name__)

# Canonical "no context" answer — never let the LLM invent one
NO_CONTEXT_ANSWER = (
    "I couldn't find any relevant information in the document store "
    "to answer your question. Please ensure the relevant documents "
    "have been ingested, or rephrase your question."
)


def _resolve_filename(meta: dict) -> str:
    filename = meta.get("filename", "unknown")
    if filename and filename != "unknown":
        return filename
    doc_id = meta.get("document_id")
    if doc_id and os.path.exists("data"):
        matches = glob.glob(os.path.join("data", f"{doc_id}_*"))
        if matches:
            base = os.path.basename(matches[0])
            if base.startswith(f"{doc_id}_"):
                return base[len(doc_id) + 1 :]
    return "unknown"


class RAGService:
    def __init__(
        self,
        embedding_provider: EmbeddingProvider,
        vector_store: VectorStoreRepository,
        llm_provider: LLMProvider,
        settings: Settings,
    ) -> None:
        self._llm = llm_provider
        self._settings = settings
        self._retrieval = RetrievalService(
            embedding_provider=embedding_provider,
            vector_store=vector_store,
            default_top_k=settings.top_k,
        )
        self._prompt_builder = PromptBuilder(
            max_context_tokens=3000,
        )
        
    
    async def answer(self, request: QueryRequest) -> RAGResponse:
        #  Retrieve
        retrieval_result = self._retrieval.retrieve(request)
        if not retrieval_result.result:
            logger.warning(
                "No relevant chunks found for question: '%s'",
                request.question[:80],
            )
            return self._empty_response(request.question)
        
        #  Build the prompt
        prompt_result = self._prompt_builder.build(
            question=request.question,
            results=retrieval_result.result,
        )
        
        # Ask the LLM
        logger.info(
            "Calling LLM — model=%s, ~%d tokens",
            self._settings.ollama_model,
            prompt_result.estimated_tokens,
        )
        answer_text = await self._llm.complete(
            prompt=prompt_result.user_prompt, 
            system_prompt=prompt_result.system_prompt,
        )
        
        return RAGResponse(
            answer=answer_text.strip(),
            question=request.question,
            sources=self._build_sources(retrieval_result.result),
            chunks_retrieved=retrieval_result.total_retrieved,
            chunks_used_in_prompt=prompt_result.chunks_used,
            estimated_prompt_tokens=prompt_result.estimated_tokens,
            model=self._settings.ollama_model,
        )
    
    async def stream(self, request: QueryRequest )-> AsyncGenerator[RAGStreamChunk, None]:
        retrieval_result = self._retrieval.retrieve(request)
        
        if not retrieval_result.result:
            logger.warning(
                "No relevant chunks found for question: '%s'",
                request.question[:80],
            )
            yield RAGStreamChunk(token=NO_CONTEXT_ANSWER, done=True)
            return    

        prompt_result = self._prompt_builder.build(
            question=request.question,
            results=retrieval_result.result,
        )

        logger.info(
            "Streaming LLM — model=%s, ~%d tokens",
            self._settings.ollama_model,
            prompt_result.estimated_tokens,
        )
        async for token in self._llm.stream(
            prompt=prompt_result.user_prompt,
            system_prompt=prompt_result.system_prompt,
            temperature=0.0,
        ):
            yield RAGStreamChunk(token=token, done=False)

        # Signal the stream is complete
        yield RAGStreamChunk(
            token="", done=True, sources=self._build_sources(retrieval_result.result)
        )
        
    def _build_sources(
        self,
        results: list,
    ) -> list[SourceChunk]:
        sources = []
        for result in results:
            meta = result.chunk.metadata
            sources.append(
                SourceChunk(
                    document_id=meta.get("document_id", "unknown"),
                    filename=_resolve_filename(meta),
                    chunk_index=meta.get("chunk_index", 0),
                    score=round(result.score, 4),
                    text_preview=result.chunk.text[:200],
                )
            )
        return sources
    
    
    def _empty_response(self, question:str) -> RAGResponse:
        return RAGResponse(
            answer=NO_CONTEXT_ANSWER,
            question=question,
            sources=[],
            chunks_retrieved=0,
            chunks_used_in_prompt=0,
            estimated_prompt_tokens=0,
            model=self._settings.ollama_model,
        )
    