from app.repositories.protocols import RerankerProvider
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
    ChatTurn
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

CONDENSER_HISTORY_TURNS = 6

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
        reranker: RerankerProvider,
        settings: Settings,
    ) -> None:
        self._llm = llm_provider
        self._settings = settings
        self._retrieval = RetrievalService(
            embedding_provider=embedding_provider,
            vector_store=vector_store,
            default_top_k=settings.top_k,
            reranker=reranker,
        )
        self._prompt_builder = PromptBuilder(
            max_context_tokens=settings.max_context_tokens,
        )
        
    
    async def answer(self, request: QueryRequest) -> RAGResponse:
        search_query = request.question
        
        if self._needs_condensation(request.question, request.chat_history):
            logger.info("Condensing query...")
            search_query = await self._condense_question(request.question, request.chat_history)
            logger.info("Condensed query: %s", search_query)

        #  Retrieve
        retrieved_request = request.model_copy(update={"question": search_query})
        retrieval_result = self._retrieval.retrieve(retrieved_request)
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
            chat_history=request.chat_history
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
        search_query = request.question
        if self._needs_condensation(request.question, request.chat_history):
            logger.info("Condensing query...")
            search_query = await self._condense_question(request.question, request.chat_history)
            logger.info("Original query: '%s', Condensed query: '%s'", request.question, search_query)
            
        retrieval_request = request.model_copy(update={"question": search_query})
        retrieval_result = self._retrieval.retrieve(retrieval_request)

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
            chat_history=request.chat_history
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
    
    
    def _needs_condensation(self, question:str, chat_history: list[ChatTurn] | None) -> bool:
        if not chat_history :
            return False
        
        ambiguous_words = {
            "it", "they", "them", "this", "that", "these", "those", "he", "she", "his", "hers",
            "هذا", "هذه", "ذلك", "تلك", "هو", "هي", "هم", "هن"
        }
        
        words = set(question.lower().split())
        return bool(words.intersection(ambiguous_words))
    
    async def _condense_question(self, question: str, chat_history: list[ChatTurn]) -> str:
        if not chat_history:
            return question
        
        history_lines = [
            f"{turn.role.upper()}: {turn.content}"
            for turn in chat_history[-CONDENSER_HISTORY_TURNS:]
        ]
        history_text = "\n".join(history_lines)
        prompt = (
            f"Given the following chat history and a follow up question, "
            f"rephrase the follow up question to be a standalone search query.\n\n"
            f"Chat History:\n{history_text}\n\n"
            f"Follow Up Question: {question}\n\n"
            f"Standalone query:"
        )
        
        system_prompt = "You are a query rewriting assistant. Output ONLY the standalone query. Do not answer it."
        try:
            standalone_query = await self._llm.complete(prompt=prompt, system_prompt=system_prompt)
            standalone_query = standalone_query.strip()
        except Exception as e:
            logger.error("Failed to condense question: %s", e)
            return question
        
        if not standalone_query or len(standalone_query) < 3:
            logger.warning("Condenser returned empty result, using original question")
            return question

        return standalone_query