import logging
from contextlib import asynccontextmanager
from app.infrastructure.vector_store.chroma import make_vector_store
from app.infrastructure.embeddings.sentence_transformer import make_embedding_service
from app.infrastructure.reranker.reranker import make_reranker
from typing import AsyncGenerator
from fastapi import FastAPI
from app.core.config import get_settings

from app.infrastructure.llm.ollama_client import make_llm_client
from app.services.rag_service import RAGService

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Everything before yield -> startup
    Everything after yield -> shutdown
    """
    settings = get_settings()
    logger.info(
        "starting doc-qa-api",
        extra={"env": settings.app_env, "debug": settings.app_debug},
    )

    logger.info("Initialising embedding service...")
    app.state.embedding_service = make_embedding_service()

    logger.info("Initialising vector store...")
    app.state.vector_store = make_vector_store()

    logger.info("Initialising LLM client...")
    app.state.llm_client = make_llm_client()

    if settings.reranker_enabled:
        logger.info("Initialising reranker...")
        app.state.reranker = make_reranker()
    else:
        logger.info("Reranker disabled, setting to None")
        app.state.reranker = None
           
    logger.info("Initialising rag service...")
    app.state.rag_service = RAGService(
        embedding_provider=app.state.embedding_service,
        vector_store=app.state.vector_store,
        llm_provider=app.state.llm_client,
        reranker=app.state.reranker,
        settings=settings,
    )
    
    
    # if the ollama client is not ready, log a warning
    if not await app.state.llm_client.health_check():
        logger.warning(
            "Ollama health check failed. "
            "Ensure Ollama is running and model '%s' is pulled.",
            settings.ollama_model,
        )
    
    logger.info("Startup complete — all systems nominal")

    yield
    logger.info("shutting down doc-qa-api")
