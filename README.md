# 🤖 AgentFlow — Visual Multi-Agent LLM Orchestration Platform

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.2.9-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19.2.4-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas_Vector_Search-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Vercel-Hobby-black?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
</p>

---

## 📌 Project Overview

**AgentFlow** is a Final Year Project (FYP) for building, testing and operating multi-agent LLM systems without writing a backend pipeline. Users assemble a workflow on a visual canvas, attach a document knowledge base, test it in a sandbox, deploy it, and call it over HTTP with a personal API key.

Everything described in this README corresponds to code that exists in this repository. Where a feature is a work in progress it is labelled as such rather than presented as finished.

**Stack at a glance:** Next.js 16 (App Router) · TypeScript · React Flow · MongoDB Atlas Vector Search · Transformers.js · Stripe · Vercel serverless.

---

## ✨ Key Features

### 🎨 1. Visual Drag-and-Drop Workflow Canvas

* **React Flow engine** — a node graph editor at `/workflow-builder` with configurable nodes and connections.
* **6 node types** — `Input`, `LLM Node`, `RAG Node`, `API Node`, `Condition`, `Output`. This list is the literal `NODE_CATALOG` in `src/lib/workflow/kimiEngine.ts`.
* **Deterministic Kimi assistant** — the in-canvas assistant plans node/edge edits with a local rule engine (`src/lib/workflow/kimiEngine.ts`). No LLM call sits between a user request and an edit, so the canvas never receives a hallucinated node.
* **Compile-and-validate Run** — the builder's **Run** button performs a real pass over the graph (node catalogue, connection validity, entry point, output presence, cycle detection via Kahn's algorithm) and reports exactly what it checked. It states plainly that nothing was executed.

### 🧠 2. Retrieval-Augmented Generation with a real vector database

* **Embeddings run in-process** — Transformers.js with `Xenova/all-MiniLM-L6-v2`, 384 dimensions, CPU-only (`src/lib/rag/embeddings.ts`).
* **MongoDB Atlas Vector Search** — `$vectorSearch` against the `agentflow_vector_index` index (`src/lib/rag/vectorStore.ts`).
* **Ingestion pipeline** — upload PDF/TXT/MD → chunk (`src/lib/rag/chunker.ts`) → embed → index. The RAG page shows a genuine byte-level upload progress bar, then a distinct server-side chunking/embedding phase, and a per-document `embedded / chunks` count so indexing state is never guessed.
* **Grounded chat** — `/dashboard/rag` answers from retrieved chunks. An empty knowledge base is reported as empty rather than answered from model memory.

### 🤖 3. Agent management and workflow synthesis

* **Agent CRUD with guaranteed-unique names** — a partial unique index on `{ userId, nameNormalized }` rejects duplicates at the database layer; the API answers `409 Conflict` with the conflicting name, and the save-failure banner on screen names the exact call that failed (`PATCH /api/agents/<id> -> HTTP 409 …`).
* **"Vibe coding" synthesis** — `POST /api/agents/generate` turns a plain-English description into a structured workflow graph.
* **Secrets encrypted at rest** — provider API keys supplied for an agent are stored with AES-256-GCM (`src/lib/crypto.ts`, key derived from `ENCRYPTION_KEY`).

### 🧪 4. Testing sandbox, run history and deployment

* **Sandbox executes the real path** — `/testing-sandbox` re-uses the same retrieval + inference code as production; **Run** sends the question, **Save Session** persists the transcript. The trace shows latency and the provider/model actually used, not fabricated timings.
* **Run history API** — `GET/POST /api/agents/runs` (inside the existing agents catch-all, no extra serverless function) keeps the 50 most recent runs per user with `kind`, `status`, `durationMs`, `sourceCount`, `provider` and `model`, plus a summary: total, sessions, succeeded, failed, average duration, last run.
* **Real deploy** — **Deploy** PATCHes `status: 'active'` and tells the user the endpoint that will serve it: `POST /api/execute`.
* **Saved sandbox sessions** are read back as workflow runs, so the analytics page is fed by events that actually happened.

### 🔒 5. Security and authentication

* **Passwords** hashed with bcryptjs; sessions are HS256 JWTs signed from `JWT_SECRET`.
* **Edge route guard** — `src/proxy.ts` protects `/dashboard`, `/workflow-builder` and `/testing-sandbox`, redirecting anonymous visitors to `/login?redirect=…`.
* **Account flows** — email verification, forgot/reset password, change password, Google OAuth, all delivered through Nodemailer + SMTP.
* **Rate limiting** — `src/lib/rateLimit.ts` is applied to the auth, contact, execute and settings routes.
* **Public API authentication** — `POST /api/execute` requires `Authorization: Bearer <key>` and compares a SHA-256 hash of the presented key against the stored `personal_api_keys.keyHash`. It answers `502` honestly when no inference provider is configured instead of inventing a response.

### 📊 6. Analytics and monitoring

* **Execution monitor** — `/dashboard/analytics` is driven by the run-history API: total runs, sessions, successes, failures, average duration and last run time.
* **Measured vs unmeasured** — the page separates runs that carry timing data from those that do not, so a chart is never drawn over missing data.
* **Working notifications** — the header bell links to the execution monitor and its unread dot only renders when the loaded run summary reports `failedRuns > 0`.
* **Visualisation** — Recharts, in the existing dark glass theme, with Framer Motion transitions and a Three.js particle background.

### 💳 7. Billing (Stripe only)

* **Plans** — Free at `$0`, Pro at `$19 / month`, Enterprise as *Contact Sales* (routes to `/contact`).
* **The displayed price is the charged price** — the landing page and the billing section both show `$19`, matching the Stripe product's `unit_amount: 1900` (USD). No display currency is used that Stripe does not actually charge.
* **Checkout flow** — `POST /api/payments/checkout` creates a Stripe Checkout session, `verify-session` confirms it, `webhook` handles the events. The Stripe client is created lazily so a missing key fails at call time instead of breaking `next build`.
* There is no Cash on Delivery, JazzCash or EasyPaisa path — payments go through Stripe exclusively.

### 🔌 8. Public execute API

* `POST /api/execute` accepts `{ agentId, input, topK? }` with a Bearer personal key. `agentId` is required and must be one of your own agents; `topK` defaults to 3.
* The handler runs retrieval, builds a grounded prompt, and calls inference through `src/lib/llm.ts`.
* `maxDuration = 60` is declared so a cold provider is not cut off by the platform first.

---

## 🛠️ Technology Stack

| Category | Technology | Notes |
| :--- | :--- | :--- |
| **Framework** | [Next.js 16.2.9](https://nextjs.org/) (App Router, Turbopack) | 21 pages, 10 serverless functions |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) | Strict across canvas, API and DB layers |
| **UI** | [Tailwind CSS v4](https://tailwindcss.com/), [Lucide](https://lucide.dev/), [Framer Motion](https://www.framer.com/motion/) | Dark glass theme |
| **Canvas** | [React Flow 11.11.4](https://reactflow.dev/) | Node graph editor |
| **Charts** | [Recharts 3](https://recharts.org/) | Analytics dashboard |
| **3D background** | [Three.js 0.184](https://threejs.org/) | Particle canvas |
| **Database** | [MongoDB native driver 7.x](https://www.mongodb.com/) + Atlas Vector Search | Workflows, agents, RAG, users, runs |
| **Embeddings** | [Transformers.js](https://huggingface.co/docs/transformers.js) — `Xenova/all-MiniLM-L6-v2` | 384-dim, runs inside the function |
| **Inference** | Hugging Face router → NVIDIA NIM → Moonshot | Ordered fallback chain in `src/lib/llm.ts` |
| **Auth & crypto** | `node:crypto` JWT (HMAC-SHA256), bcryptjs, AES-256-GCM | Session cookie + edge proxy |
| **Email** | [Nodemailer](https://nodemailer.com/) over SMTP | Verification and password reset |
| **Payments** | [Stripe](https://stripe.com/) | Checkout, verify-session, webhook |
| **Validation** | Native TypeScript guards | — |

> `zustand` and `zod` appear in `package.json` but are not imported anywhere in `src/`; the application state is plain React state. They are listed here as unused dependencies rather than as architecture.

---

## 📂 Project Architecture

```
fypagent/
├── public/                     # Static assets
├── src/
│   ├── app/                    # App Router
│   │   ├── api/                # 10 serverless entry points (see API surface below)
│   │   ├── dashboard/          # agents, rag, analytics, deployment, payment,
│   │   │                       # profile, settings, templates
│   │   ├── workflow-builder/   # React Flow canvas + Kimi assistant
│   │   ├── testing-sandbox/    # live run sandbox + run history
│   │   └── login, signup, forgot-password, reset-password,
│   │       about, contact, docs, terms, privacy
│   ├── components/
│   │   ├── layout/             # DashboardLayout, BuilderLayout, Sidebar, PublicLayout
│   │   ├── billing/            # BillingSection
│   │   └── ui/, workflow/, testing/, analytics/, deployment/
│   ├── lib/
│   │   ├── api/routeDispatch.ts   # shared catch-all dispatcher
│   │   ├── auth/jwt.ts            # session mint/verify
│   │   ├── mongo/                 # connection + one module per collection
│   │   ├── rag/                   # chunker, embeddings, vectorStore
│   │   ├── workflow/kimiEngine.ts # deterministic canvas edit engine
│   │   ├── llm.ts                 # provider fallback chain
│   │   ├── crypto.ts              # AES-256-GCM
│   │   ├── rateLimit.ts           # in-memory sliding limiter
│   │   ├── stripe.ts              # lazy Stripe client
│   │   └── agentName.ts / agentNameStore.ts   # unique-name rules
│   ├── utils/mailer.ts          # Nodemailer transport
│   └── proxy.ts                 # edge route guard
├── tests/kimi-engine/           # 73-assertion suite (npm run test:workflow)
├── next.config.ts
├── vercel.json
├── package.json
└── README.md
```

---

## 🔌 API Surface

Ten serverless functions. Per-domain traffic is routed through catch-all handlers (`[[...path]]` + `src/lib/api/routeDispatch.ts`), which is what keeps the project inside the Vercel Hobby limit of 12 functions.

| Function | Operations |
| :--- | :--- |
| `/api/auth/[[...path]]` | `signup`, `login`, `logout`, `me`, `profile`, `change-password`, `forgot-password`, `reset-password`, `verify-email`, `google/start`, `google/callback` |
| `/api/agents/[[...path]]` | list/create/get/patch/delete agents, `generate`, `runs` |
| `/api/rag/[[...path]]` | `upload`, `status`, `query`, `chat`, `reindex` |
| `/api/payments/[[...path]]` | `checkout`, `verify-session`, `webhook` |
| `/api/settings/[[...path]]` | `api-keys`, `system` |
| `/api/dev/[[...path]]` | `init-collections` — creates the indexes on first run; requires the `x-dev-secret` header |
| `/api/execute` | public Bearer-key execution endpoint |
| `/api/keys` | store a provider key against the signed-in user |
| `/api/rate-limit` | rate-limit probe |
| `/api/contact` | contact form |

Two URLs are load-bearing and must never change: `/api/auth/google/callback` and `/api/auth/verify-email` (both are registered with external providers).

---

## 🚀 Getting Started

### Prerequisites

* **Node.js 20.9+** (required by Next.js 16; developed on Node 22)
* **MongoDB** — a cluster with **Atlas Vector Search** enabled. Local MongoDB will run the app but `$vectorSearch` queries need Atlas.
* At least one inference key (see below), or `MOCK_LLM=1` for an offline run.

### 1. Clone

```bash
git clone https://github.com/SP23-BSE-106/fypagent.git
cd fypagent
```

### 2. Install

```bash
npm ci
```

### 3. Configure environment

Create `.env.local` in the project root (this file is gitignored and is never committed):

```env
# --- required ---
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>
MONGODB_DB=agentflow
JWT_SECRET=long-random-string-signing-and-encryption-fallback

# --- inference: configure at least one, or mock ---
HF_TOKEN=hf_...
NVIDIA_API_KEY=nvapi-...
KIMI_API_KEY=...            # or MOONSHOT_API_KEY
# MOCK_LLM=1                # offline mode, no provider needed
# NEXT_PUBLIC_MOCK_LLM=1    # client-side mock for the canvas

# --- RAG: Atlas Vector Search ---
# Create a $vectorSearch index named agentflow_vector_index on the
# rag_chunks collection, 384 dimensions, field "embedding"

# --- email (verification + password reset) ---
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=you@gmail.com
SMTP_PASS=app-password
SMTP_FROM=AgentFlow <you@gmail.com>

# --- crypto (optional: falls back to JWT_SECRET) ---
ENCRYPTION_KEY=another-long-random-string

# --- billing ---
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 🧪 Build & Verification

```bash
npm run build          # type-check + production build (10 functions)
npm run lint           # eslint
npm run test:workflow  # deterministic Kimi engine suite -> 73/73 passed
```

`npm run test:workflow` compiles `tests/kimi-engine/test.js` with `tsc` and runs it; it covers node creation, connection planning, cycle avoidance, name uniqueness and the assistant's reply contract.

---

## ☁️ Deployment

* Hosted on **Vercel (Hobby plan)** — which allows 12 serverless functions; this project uses **10**.
* **Never add a new `route.ts`.** Add an operation to the relevant domain's `[[...path]]` handler instead, or the function budget is exceeded and the deploy fails.
* `maxDuration` is set explicitly on the long-running routes (`/api/execute` = 60s).
* Secrets (`MONGODB_URI`, `JWT_SECRET`, provider keys, Stripe keys) live in Vercel project settings — the build must succeed without any `.env.local`.

---

## 📜 License

This project was developed as a **Final Year Project (FYP)** for academic evaluation. All rights reserved.

---

<p align="center">
  Crafted with ❤️ using <strong>Next.js 16</strong>, <strong>React Flow</strong> and <strong>TypeScript</strong>.
</p>

