from app.domain.models import SearchResult
from enum import Enum
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(description="ok | degraded | error")
    environment: str = Field(description="development | staging | production")
    model: str = Field(description="Active Ollama model name")
    version: str = Field(description="API version string")


class ErrorResponse(BaseModel):
    """Standard error envelope used across all endpoints."""

    detail: str
    code: str = Field(default="internal_error")


class ChunkingStrategy(str, Enum):
    FIXED = "fixed"
    RECURSIVE = "recursive"
    SEMANTIC = "semantic"


class IngestRequest:
    document_id: str = Field(
        description="Caller-supplied stable id, used for upsert idempotency."
    )
    chunking_strategy: ChunkingStrategy = Field(
        default=ChunkingStrategy.RECURSIVE,
        description="Algorithm used to split docs into chunks",
    )
    chunk_size: int = Field(
        default=None,
        ge=64,
        le=4096,
        description="Override the default chunk size from settings.",
    )
    chunk_overlap: int | None = Field(
        default=None,
        ge=0,
        description="Override the default chunk overlap from settings.",
    )
    metadata: dict = Field(
        default_factory=dict,
        description="Arbitrary key-value pairs attached to every chunk (e.g. author, date).",
    )


class IngestResponse(BaseModel):
    """Response after uploaded a file and successfully ingested"""

    document_id: str
    filename: str
    chunks_created: int
    chunking_strategy: ChunkingStrategy
    message: str


class PromptResult(BaseModel):
    system_prompt:str
    user_prompt:str
    chunks_used: int
    chunks_available: int
    estimated_tokens: int
    

class QueryRequest(BaseModel):
    question: str = Field(min_length=3, max_length=10000,description="The question to ask")
    top_k: int | None = Field(default=None,ge=1, le=100, description="The number of chunks to use")
    min_score: float  = Field(default=0.4, ge=0.0, le=1.0, description="The minimum score to use")
    document_ids : list[str] | None = Field(default=None, description="The ids of the documents to use")
    

class RetrievalResult(BaseModel):
    result: list[SearchResult]
    question: str
    total_retrieved: int
    total_after_filter: int
    min_score_used: float    
    

class SourceChunk(BaseModel):
    document_id: str = "unknown"
    filename: str = "unknown"
    chunk_index: int = 0
    score: float = 0.0
    text: str = ""
    text_preview: str = ""

    model_config = {"populate_by_name": True, "extra": "ignore"}


class RAGResponse(BaseModel):
    answer: str
    question: str
    sources: list[SourceChunk]
    chunks_retrieved: int
    chunks_used_in_prompt: int
    estimated_prompt_tokens: int
    model: str


class RAGStreamChunk(BaseModel):
    token: str
    done: bool = False
    sources: list[SourceChunk] | None = None


# --- Auth Schemas ---
class UserCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=100)


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    full_name: str
    email: str
    created_at: str | None = None
    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# --- Document Schemas ---
class DocumentResponse(BaseModel):
    id: str
    document_id: str
    filename: str
    file_size: int
    mime_type: str
    chunk_count: int
    created_at: str | None = None
    model_config = {"from_attributes": True}


# --- Chat Schemas ---
class ChatMessageCreate(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str
    sources: list[dict] | None = None


class ChatMessageResponse(BaseModel):
    id: str
    role: str
    content: str
    sources: list[dict] | None = []
    created_at: str | None = None
    model_config = {"from_attributes": True}

class PaginatedChatMessageResponse(BaseModel):
    items: list[ChatMessageResponse]
    next_cursor: str | None = None
