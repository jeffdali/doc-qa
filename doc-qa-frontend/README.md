# doc-qa-frontend — Frontend

> Part of the [doc-qa full-stack application](../README.md) — see the root README for the complete setup guide.

The Next.js frontend for the **doc-qa** document Q&A platform. Provides the full user interface for uploading documents, managing your library, and chatting with your documents via a streaming AI assistant.

---

## Features

- 🔐 **Auth flows** — Login & Sign Up pages
- 📂 **Dashboard** — document library with upload, preview, and delete
- 📤 **Upload** — drag-and-drop document ingestion with chunking strategy selector
- 💬 **Chat** — real-time streaming Q&A interface per document
- 📱 **Responsive** — works on desktop and mobile

---

## Tech Stack

| | |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| State / Data | React Query / fetch |
| Auth | JWT stored in cookies |

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Set the backend URL:

```env
NEXT_PUBLIC_API_URL=http://localhost:8001
```

### 3. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Available Scripts

```bash
npm run dev      # Start development server (hot reload)
npm run build    # Build production bundle
npm run start    # Start production server
npm run lint     # Run ESLint
```

---

## Project Structure

```
src/
├── app/                # Next.js App Router pages
│   ├── login/          # Login page
│   ├── signup/         # Sign up page
│   ├── dashboard/      # Document library
│   ├── upload/         # Document upload
│   └── chat/           # Chat interface
├── components/         # Shared UI components
├── features/           # Feature-scoped logic & components
├── lib/                # API client, utilities
└── shared/             # Types, constants, hooks
```
