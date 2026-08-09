from __future__ import annotations
from pydantic import BaseModel, Field


class Chunk(BaseModel):
    id: str = Field(description="Unique identifier: {doc_id}_{chunk_index}")
    text: str = Field(description="Raw text content")
    embedding: list[float] = Field(
        default_factory=list, description="Vector representation"
    )
    metadata: dict = Field(
        default_factory=dict, description="Source and page information ..etc"
    )


class Document(BaseModel):
    id: str
    file_name: str
    content: str
    metadata: dict = Field(default_factory=dict)


class SearchResult(BaseModel):
    chunk: Chunk
    score: float = Field(description="Cosine similarity score, 0.0–1.0")


    
    