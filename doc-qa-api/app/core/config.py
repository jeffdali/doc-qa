from functools import lru_cache
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=False, extra="ignore"
    )

    # Application
    app_env: str = Field(
        description="development | staging | production"
    )
    app_debug: bool
    app_host: str
    app_port: int

    # Database
    database_url: str = Field(
        description="PostgreSQL async connection URL",
    )

    # JWT Authentication
    jwt_secret_key: str = Field(
        description="Secret key for JWT token encoding",
    )
    jwt_algorithm: str
    jwt_expire_minutes: int = Field(description="7 days")

    # ollama
    ollama_base_url: str
    ollama_model: str
    ollama_timeout: int = Field(description="Seconds")

    # vector store
    chroma_persist_dir: str
    chroma_collection_name: str

    # embedding
    embedding_model: str
    embedding_device: str = Field(description="cpu | cuda | mps")

    # chunking
    chunk_size: int = Field(ge=64, le=4096)
    chunk_overlap: int = Field(ge=0, le=512)

    # retrieval
    top_k: int = Field(ge=1, le=50)

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def is_developement(self) -> bool:
        return self.app_env == "developement"

    @field_validator("chunk_overlap")
    @classmethod
    def overlap_must_be_less_than_chunk_size(cls, v, info):
        chunk_size = info.data.get("chunk_size")
        if chunk_size is not None and v > chunk_size:
            raise ValueError(
                f"chunk_overlap ({v}) must be less than chunk_size ({chunk_size})"
            )
        return v


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
