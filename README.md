# doc-qa — Full-Stack AI Document Q&A

A complete, self-hostable **full-stack application** for document Q&A powered by **Retrieval-Augmented Generation (RAG)**.  
Upload your documents and have natural conversations with them — no cloud AI required. Everything runs locally.

```
┌─────────────────────────┐        ┌──────────────────────────────┐
│   doc-qa-frontend       │  HTTP  │   doc-qa-api                 │
│   Next.js 16 App Router │◄──────►│   FastAPI + RAG pipeline     │
│   TypeScript + Tailwind │        │   Ollama · ChromaDB · PG     │
└─────────────────────────┘        └──────────────────────────────┘
                                              │
                                   ┌──────────▼──────────┐
                                   │  Ollama (local LLM)  │
                                   │  gemma4 / llama3 /   │
                                   │  mistral / …         │
                                   └─────────────────────┘
```

---

## What It Does

- 📄 **Upload documents** — PDF, TXT, Markdown
- 🔍 **Semantic search** — Sentence-Transformer embeddings + ChromaDB vector store
- 🤖 **Local LLM answers** — powered by [Ollama](https://ollama.ai), no API keys needed
- 🌊 **Streaming responses** — real-time token-by-token output via SSE
- 🔐 **Multi-user auth** — JWT-based accounts with document ownership
- 💬 **Chat history** — persistent per-document conversation history

---

## Repository Structure

```
doc-qa/
├── doc-qa-api/          # FastAPI backend (RAG pipeline, REST API)
├── doc-qa-frontend/     # Next.js frontend (UI)
└── dev.sh               # One-command local development launcher
```

---

## Quick Start

### Prerequisites

| Tool | Purpose |
|---|---|
| Python 3.12+ + [uv](https://github.com/astral-sh/uv) | Backend runtime & package manager |
| Node.js 18+ + npm | Frontend runtime |
| [Ollama](https://ollama.ai) | Local LLM inference |
| PostgreSQL 14+ | Persistent user/document/chat storage |

### 1. Clone the repo

```bash
git clone https://github.com/<you>/doc-qa.git
cd doc-qa
```

### 2. Start Ollama and pull a model

```bash
ollama serve          # if not already running as a service
ollama pull gemma4    # or: llama3, mistral, phi3, etc.
```

### 3. Set up the backend

```bash
cd doc-qa-api
cp .env.example .env   # fill in DATABASE_URL and JWT_SECRET_KEY at minimum
uv sync
uv run alembic upgrade head
```

### 4. Set up the frontend

```bash
cd ../doc-qa-frontend
npm install
```

Set the backend URL via an environment variable before running:

```bash
export NEXT_PUBLIC_API_URL=http://localhost:8001/api/v1
```

### 5. Run both servers

#### Option A — `dev.sh` (recommended, macOS)

> [!NOTE]
> `dev.sh` is a bash script tested on **macOS**. It starts both servers in the background and shuts them both down cleanly with a single `Ctrl+C`.

```bash
# From the repo root:
bash dev.sh
```

What it does:
- Runs `uv sync` and starts the **FastAPI backend** on `http://localhost:8001`
- Waits 2 seconds, then starts the **Next.js frontend** on `http://localhost:3001`
- Registers a `Ctrl+C` trap to gracefully terminate both processes together

#### Option B — separate terminals

```bash
# Terminal 1 — backend
cd doc-qa-api && make dev          # http://localhost:8001

# Terminal 2 — frontend
cd doc-qa-frontend && npm run dev  # http://localhost:3001
```

Open **http://localhost:3001** in your browser.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16.2.12, React 19, TypeScript 5, Tailwind CSS 4, Radix UI |
| **Backend** | FastAPI, Python 3.12+, uv |
| **LLM** | Ollama (local — any model) |
| **Embeddings** | Sentence-Transformers |
| **Vector Store** | ChromaDB (persistent) |
| **Database** | PostgreSQL (async SQLAlchemy + Alembic, asyncpg driver) |
| **Auth** | JWT via python-jose |
| **Chunking** | Chonkie (fixed, recursive, semantic strategies) |
| **PDF parsing** | pypdf |

---

## Documentation

- [Backend README](./doc-qa-api/README.md) — API reference, configuration, project structure
- [Frontend README](./doc-qa-frontend/README.md) — UI setup, environment variables

---

## API Base URL

The backend exposes its full interactive API docs at:
```
http://localhost:8001/docs      # Swagger UI
http://localhost:8001/redoc     # ReDoc
```
