# doc-qa-frontend — Frontend

> Part of the [doc-qa full-stack application](../README.md) — see the root README for the complete setup guide.

The Next.js frontend for the **doc-qa** document Q&A platform. Provides the full user interface for uploading documents, managing your library, and chatting with your documents via a streaming AI assistant.

---

## Features

- 🔐 **Auth flows** — Login & Sign Up pages with JWT stored in localStorage
- 📂 **Dashboard** — document library with upload and delete
- 📤 **Upload** — document ingestion with chunking strategy selector
- 💬 **Chat** — real-time streaming Q&A interface per document (SSE)

---

## Tech Stack

| | |
|---|---|
| Framework | Next.js 16.2.12 (App Router) |
| Language | TypeScript 5 |
| Runtime | React 19 |
| Styling | Tailwind CSS 4 |
| UI Primitives | Radix UI (Dialog, DropdownMenu, Label, Slot, Tooltip) |
| Icons | Lucide React |
| API | Native `fetch` with a custom typed `apiClient` |
| Auth | JWT stored in `localStorage` |

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure the API URL

The frontend reads the backend URL from an environment variable:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8001/api/v1
```

The default fallback in the code is `http://localhost:8001/api/v1`.

### 3. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

---

## Available Scripts

```bash
npm run dev      # Start development server on port 3001 (hot reload)
npm run build    # Build production bundle
npm run start    # Start production server on port 3001
npm run lint     # Run ESLint
```

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Root / landing page
│   ├── login/              # Login page
│   ├── signup/             # Sign up page
│   ├── dashboard/          # Document library
│   ├── upload/             # Document upload
│   └── chat/[documentId]/  # Chat interface (dynamic route)
├── components/
│   ├── layout/             # AppLayout, Navbar, Sidebar
│   └── ui/                 # Reusable UI components (Button, Card, Dialog, Input, Badge)
├── features/
│   ├── chat/               # useSSEStream hook for streaming
│   └── documents/          # UploadModal component
├── lib/                    # Utilities (cn helper)
└── shared/
    ├── api/                # apiClient, fetch wrapper, TypeScript types
    └── context/            # AuthContext (React context for user session)
```
