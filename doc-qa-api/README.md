# doc-qa-api — Backend

> Part of the [doc-qa full-stack application](../README.md) — see the root README for the complete setup guide.

A production-ready **Retrieval-Augmented Generation (RAG)** REST API for document Q&A.  
Upload your documents, ask questions in natural language, and get grounded answers powered by a **local LLM via Ollama** and semantic search via **ChromaDB**.


---

## Features

- 📄 **Document ingestion** — PDF, TXT, Markdown
- ✂️ **Flexible chunking** — Fixed, Recursive (default), or Semantic strategies
- 🔍 **Semantic retrieval** — Sentence-Transformer embeddings + ChromaDB vector store
- 🤖 **Local LLM inference** — Ollama (gemma4, llama3, mistral, etc.)
- 🌊 **Streaming responses** — Token-by-token via Server-Sent Events
- 🔐 **JWT authentication** — User accounts with document ownership
- 💬 **Chat history** — Persistent per-document conversation history
- 🗃️ **PostgreSQL** — Async SQLAlchemy with Alembic migrations

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | FastAPI + Uvicorn |
| LLM | Ollama (local, any model) |
| Embeddings | Sentence-Transformers (`BAAI/bge-base-en-v1.5` recommended) |
| Vector Store | ChromaDB (persistent) |
| Database | PostgreSQL (async via asyncpg) |
| Auth | JWT (PyJWT) |
| Package manager | [uv](https://github.com/astral-sh/uv) |

---

## Prerequisites

- Python 3.12+
- [uv](https://github.com/astral-sh/uv) — `pip install uv`
- [Ollama](https://ollama.ai) running locally with a model pulled (e.g. `ollama pull gemma4`)
- PostgreSQL 14+ database

---

## Setup

### 1. Clone & install dependencies

```bash
git clone <repo-url>
cd doc-qa-api

uv sync
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your values — at minimum:

```env
DATABASE_URL=postgresql+asyncpg://<user>:<password>@localhost:5432/docqa
JWT_SECRET_KEY=<generate a long random string>
OLLAMA_MODEL=gemma4        # or any model you have pulled
EMBEDDING_MODEL=BAAI/bge-base-en-v1.5
```

### 3. Run database migrations

```bash
uv run alembic upgrade head
```

### 4. Start the server

```bash
make dev
# or directly:
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

The API will be available at `http://localhost:8001`.  
Interactive docs: `http://localhost:8001/docs`

---

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Register a new user |
| `POST` | `/api/v1/auth/login` | Login & get JWT token |
| `POST` | `/api/v1/documents/upload` | Upload & ingest a document |
| `GET` | `/api/v1/documents/` | List your documents |
| `DELETE` | `/api/v1/documents/{id}` | Delete a document |
| `POST` | `/api/v1/rag/query` | Ask a question (blocking) |
| `POST` | `/api/v1/rag/stream` | Ask a question (streaming) |
| `GET` | `/api/v1/chat/{doc_id}/messages` | Get chat history |
| `DELETE` | `/api/v1/chat/{doc_id}/messages` | Clear chat history |

---

## Development

```bash
make lint       # ruff check
make format     # ruff format
make test       # run unit + integration tests
```

---

## Environment Variables Reference

See [`.env.example`](.env.example) for all available settings with their defaults.

---

## Project Structure

```
app/
├── api/v1/endpoints/   # FastAPI route handlers
├── core/               # Config, dependencies, lifespan, factory
├── domain/             # Pydantic schemas & domain models
├── infrastructure/     # Chunking, embeddings, LLM, parsing, vector store, DB
├── repositories/       # Abstract protocols (interfaces)
└── services/           # Business logic (RAG, ingestion, retrieval, auth)
```
