from typing import Annotated
from fastapi import Request, Depends
from app.repositories.protocols import EmbeddingProvider, VectorStoreRepository, LLMProvider
from app.services.rag_service import RAGService
from app.core.config import Settings, get_settings


def get_embedding_service(request: Request) -> EmbeddingProvider:
    return request.app.state.embedding_service


def get_vector_store(request: Request) -> VectorStoreRepository:
    return request.app.state.vector_store

def get_llm_client(request: Request) -> LLMProvider:
    return request.app.state.llm_client    


def get_rag_service(
    embedding_provider: Annotated[EmbeddingProvider, Depends(get_embedding_service)],
    vector_store: Annotated[VectorStoreRepository, Depends(get_vector_store)],
    llm_provider: Annotated[LLMProvider, Depends(get_llm_client)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> RAGService:
    return RAGService(
        embedding_provider=embedding_provider,
        vector_store=vector_store,
        llm_provider=llm_provider,
        settings=settings,
    )



EmbeddingDep = Annotated[EmbeddingProvider, Depends(get_embedding_service)]
VectorStoreDep = Annotated[VectorStoreRepository, Depends(get_vector_store)]
LLMClientDep = Annotated[LLMProvider, Depends(get_llm_client)]
RAGServiceDep = Annotated[RAGService, Depends(get_rag_service)]

from fastapi import HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.infrastructure.database.models import User
from app.infrastructure.database.session import get_db
from app.services.auth_service import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    user_id: str | None = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        raise credentials_exception
    return user


CurrentUserDep = Annotated[User, Depends(get_current_user)]