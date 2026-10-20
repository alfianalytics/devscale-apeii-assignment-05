# Assignment 05: Anvia Full-Stack Chat & Research Monorepo

> **AI Product Engineering with TypeScript Batch II (Day 11 – Day 14)**  
> Full-stack ChatGPT-style conversational application built in a **pnpm workspace monorepo** with **TanStack Router**, **@anvia/react-ui**, **Hono**, **@anvia/server**, **@anvia/core**, **Tavily Web Search**, **Knowledge Base RAG**, **Cross-Session User Memory**, and **Prisma 8 PostgreSQL Memory**.

---

## 🏗️ Monorepo Architecture

```text
devscale-apeii-assignment-05/
├── apps/
│   ├── api/                        # Hono HTTP streaming server (@anvia/server + @anvia/client)
│   │   ├── src/
│   │   │   ├── index.ts            # CORS (exposing x-anvia-stream-protocol), logger, route mounting
│   │   │   └── modules/
│   │   │       ├── chat/router.ts  # POST /api/chat (streams framed JSONL agent events)
│   │   │       └── session/router.ts # GET /api/session, GET /api/session/:id, DELETE /api/session/:id
│   │   └── package.json
│   └── web/                        # React 19 + TanStack Router + Tailwind v4 + @anvia/react-ui
│       ├── src/
│       │   ├── components/
│       │   │   ├── chat-screen.tsx # ChatProvider, ThreadPrimitive, MessagePrimitive, ComposerPrimitive
│       │   │   └── tool-call.tsx   # Expandable tool execution inspector card
│       │   ├── lib/
│       │   │   └── pending-message.ts # One-time first message handoff from / to /s/$id
│       │   └── routes/
│       │       ├── __root.tsx      # Sidebar layout with live session history list & New Chat
│       │       ├── index.tsx       # Home screen with starter cards & initial prompt form
│       │       └── s.$id.tsx       # Dynamic session route restoring history via messagesToUIMessages
│       └── package.json
├── packages/
│   ├── agents/                     # Shared @repo/agents package (@anvia/core + @anvia/openai)
│   │   ├── src/
│   │   │   ├── index.ts            # runAgent({ prompt, messages, memory, session })
│   │   │   ├── tools.ts            # web_search, search_knowledge_base, read_webpage, remember_user_fact
│   │   │   └── user-memory.ts      # Persistent cross-session user profile memory
│   │   └── package.json
│   └── db/                         # Shared @repo/db package (@prisma/orm-postgres + @anvia/memory-prisma/v8)
│       ├── src/
│       │   ├── index.ts            # PrismaMemoryStore with resilient file-backed fallback
│       │   └── prisma/
│       │       ├── contract.prisma # Prisma 8 Anvia Memory models
│       │       ├── contract.json   # Emitted Prisma 8 contract
│       │       └── contract.d.ts   # Generated TypeScript contract types
│       ├── prisma.config.ts
│       └── package.json
├── docker-compose.yml              # Local PostgreSQL 16 service
├── pnpm-workspace.yaml             # Workspace configuration
└── package.json                    # Root scripts
```

---

## ✨ Key Features

1. **Streaming Agent Protocol (`anvia.client.v3`)**:
   - `POST /api/chat` validates incoming requests with `parseClientStreamRequest`, runs the agent via `agentToClientStream`, and streams framed JSONL events using `createClientStreamResponse`.
   - Exposes `x-anvia-stream-protocol` via CORS so the browser transport (`createHttpClientTransport`) can read the stream directly.
2. **TanStack Router + `@anvia/react-ui` Chat Interface**:
   - **Root Layout (`__root.tsx`)**: Loads saved sessions from `GET /api/session` and renders a persistent sidebar with links to `/s/$id` and session deletion.
   - **Home Route (`/`)**: Generates a new session ID (`newSessionId()`), stores the initial message once in `pending-message.ts`, and navigates to `/s/$id`.
   - **Session Route (`/s/$id`)**: Fetches conversation history from `GET /api/session/:id`, converts stored messages via `messagesToUIMessages`, and initializes `useChat({ transport, initialMessages })`.
   - **Automatic Sidebar Refresh**: Invalidates the root route loader on `run_end` events so newly created chats immediately appear in the sidebar.
3. **Suite of 4 Agent Tools (`@repo/agents`)**:
   - **`web_search`**: Searches the live web via `@tavily/core` for current facts, documentation, and URLs.
   - **`search_knowledge_base`**: Retrieves internal company policies & RAG documents (e.g., *Atlas password reset link 30-minute expiry policy*, *Anvia full-stack architecture*, *HR leave policy*) with source citations.
   - **`read_webpage`**: Fetches and extracts readable text from public URLs for deeper analysis.
   - **`remember_user_fact`**: Saves personal facts, preferences, name, and project details into persistent cross-session memory (`.user-memory.json`) so the agent remembers the user across all future chat sessions.
4. **Prisma 8 PostgreSQL Memory & Resilient Persistence (`@repo/db`)**:
   - Uses `@anvia/memory-prisma/v8` (`PrismaMemoryStore`) with `savePolicy: "turn"`.
   - Includes a file-backed fallback store (`FileBackedFallbackStore` -> `.sessions-memory.json`) when Docker/PostgreSQL is offline so sessions survive server restarts in any environment.

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` in the repository root:

```bash
cp .env.example .env
```

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mydb"
OPENAI_API_KEY=your_devscale_or_openai_api_key
OPENAI_BASE_URL=https://gateway.devscale.id/v1
MODEL_ID=deepseek-v4.1-flash
TAVILY_API_KEY=your_tavily_api_key
PORT=8000
VITE_API_URL=http://localhost:8000
```

### 3. Start PostgreSQL & Update Schema (Optional if using Docker)

```bash
docker compose up -d
pnpm db:emit
pnpm db:update
```

### 4. Run Full-Stack Development Servers

Start both the Hono API (`http://localhost:8000`) and the Vite + TanStack Router Web UI (`http://localhost:3000`) in parallel:

```bash
pnpm dev
```

Or run them in separate terminals:

```bash
# Terminal 1 — API Server (:8000)
pnpm dev:api

# Terminal 2 — Web Frontend (:3000)
pnpm dev:web
```

---

## 🧪 Testing Scenarios

1. **Internal Policy / RAG Lookup (`search_knowledge_base`)**:
   - Ask: *"My Atlas password reset link is 45 minutes old. Can I still use it?"*
   - The agent calls `search_knowledge_base`, retrieves the Atlas policy (links expire after 30 minutes), and answers with a grounded citation `[1]`.
2. **Live Web Research (`web_search`)**:
   - Ask: *"Search the web for the latest TypeScript features and summarize with source URLs."*
   - The agent calls `web_search` (Tavily), displays the expandable tool call badge in the UI, and streams a Markdown summary.
3. **Session & Cross-Session Memory (`remember_user_fact`)**:
   - Tell the agent: *"My name is Alfian and my project is Atlas. Please remember this."*
   - Refresh the browser at `/s/chat-xxxx` or click **+ New Conversation** to start a brand-new session and ask: *"Who am I and what project am I working on?"*
   - Both per-session history and cross-session user memory persist across refreshes and server restarts.
