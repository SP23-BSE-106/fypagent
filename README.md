# 🤖 AgentFlow — Visual Multi-Agent LLM Orchestration Platform

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.2.9-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19.2.4-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/MongoDB-7.4.0-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
</p>

---

## 📌 Project Overview

**AgentFlow** is a Final Year Project (FYP) engineered to resolve the complexity of constructing, managing, and scaling multi-agent LLM systems. Instead of hardcoding complex model pipelines in long backend scripts, **AgentFlow** provides a premium, interactive visual orchestration canvas. 

Users can seamlessly visually bridge **Prompt Templates**, **Vector RAG (Retrieval-Augmented Generation) Pipelines**, **Document Chunkers**, and **Web API Hooks** within an intuitive drag-and-drop workflow canvas.

---

## ✨ Key Features

### 🎨 1. Visual Drag-and-Drop Workflow Canvas
* **React Flow Engine**: Node-based graphical interface for connecting agents, tools, prompt templates, and data sinks.
* **Custom Node Schemas**: Configurable inputs, outputs, parameters, and conditional branching logic.
* **Zustand State Engine**: Real-time state synchronization across canvas nodes, control sidebars, and execution graphs.

### 🤖 2. Multi-Agent & RAG Orchestration
* **Agent Management**: Define specialized agent personas, temperature parameters, system prompts, and tool access.
* **Agent Versioning**: Maintain version history for agent configurations and rollback effortlessly.
* **Vector RAG Pipelines**: Upload documents, manage chunking strategies, and link embeddings directly into agent workflows.

### 🧪 3. Interactive Testing Sandbox & Live Tracing
* **Simulated Execution**: Test workflow pipelines with user query inputs directly inside an interactive testing sandbox.
* **Intermediate Step Tracing**: Inspect step-by-step token transfers, execution duration, model output states, and debug logs.

### 🔒 4. Enterprise Security & Authentication
* **Full Authentication**: Secure signup/login with BCrypt password hashing, session tokens, and middleware route protection.
* **Password Reset Workflow**: Automated email recovery system integrated via Nodemailer and SMTP triggers.
* **API Key Encryption & Rate Limiting**: Secure API key generation with AES crypto encryption and built-in rate-limiting middleware.
* **Audit Logging**: Comprehensive activity tracking for user actions, workflow deployments, and key access events.

### 📊 5. Analytics & Dashboard
* **Usage Metrics**: Monitor execution velocity, token usage, active workflows, and agent statistics with Recharts data visualization.
* **Modern Cyber-Glass Aesthetics**: Dark mode interface designed with glassmorphism, Framer Motion micro-animations, and dynamic Three.js canvas backgrounds.

---

## 🛠️ Technology Stack

| Category | Technology | Description |
| :--- | :--- | :--- |
| **Framework** | [Next.js 16 (App Router)](https://nextjs.org/) | React Server Components, API routes, and modern routing |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | End-to-end type safety across client canvas and backend models |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) + Lucide | Utility-first responsive dark theme and crisp icon sets |
| **Canvas & Motion** | [React Flow](https://reactflow.dev/) + [Framer Motion](https://framer.com/motion) | Drag-and-drop node graph & slick panel animations |
| **3D Engine** | [Three.js](https://threejs.org/) | Dynamic particle background rendering |
| **State Management**| [Zustand](https://zustand-demo.pmnd.rs/) | Global state store for canvas nodes, logs, and settings |
| **Database** | [MongoDB Native Driver](https://www.mongodb.com/) | Document store for workflows, agents, RAG chunks, & user profiles |
| **Security & Email** | Bcryptjs, Nodemailer, Zod, Crypto | Password encryption, SMTP email delivery, and schema validation |

---

## 📂 Project Architecture

```
AgentFlow/
├── public/                    # Static assets & favicon
├── src/
│   ├── app/                   # Next.js App Router (Pages & API routes)
│   │   ├── (auth)/            # Login, Signup, Forgot/Reset Password
│   │   ├── api/               # Serverless API routes (auth, workflow, agents)
│   │   ├── dashboard/         # Main workspace dashboard & analytics
│   │   ├── workflow-builder/  # Visual React Flow node canvas workspace
│   │   └── testing-sandbox/   # Live pipeline simulation & log viewer
│   ├── components/            # Reusable UI & Layout Components
│   │   ├── layout/            # Navbar, Sidebar, Footer, Public Layout
│   │   └── ui/                # Buttons, Cards, Badges, Three.js canvas
│   ├── lib/                   # Utility libraries & services
│   │   ├── auth/              # JWT & session handling
│   │   ├── mongo/             # Database connection & collection schemas
│   │   ├── crypto.ts          # Encryption helpers
│   │   └── rateLimit.ts       # Rate limiting middleware
│   └── middleware.ts          # Protected route guard middleware
├── .env.local.example         # Environment variable configuration template
├── next.config.ts             # Next.js configuration
├── package.json               # Dependencies and build scripts
└── README.md                  # Project documentation
```

---

## 🚀 Getting Started

Follow these instructions to get a copy of **AgentFlow** up and running on your local machine.

### Prerequisites

* **Node.js**: `v18.x` or higher
* **npm** or **yarn** or **pnpm**
* **MongoDB**: A running MongoDB instance (Local or MongoDB Atlas)

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-username/agentflow.git
cd agentflow
```

---

### Step 2: Install Dependencies

```bash
npm install
```

---

### Step 3: Configure Environment Variables

Create a `.env.local` file in the root directory (refer to `.env.local.example`):

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/agentflow

# SMTP Configuration (For password reset emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=AgentFlow <your_email@gmail.com>

# Security Secrets
NEXTAUTH_SECRET=your_jwt_secret_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

### Step 4: Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 🧪 Build & Verification

To verify typescript compilation and generate the production build:

```bash
npm run build
```

To run ESLint code analysis:

```bash
npm run lint
```

---

## 📜 License

This project was developed as a **Final Year Project (FYP)** for academic evaluation. All rights reserved.

---

<p align="center">
  Crafted with ❤️ using <strong>Next.js 16</strong>, <strong>React Flow</strong>, and <strong>TypeScript</strong>.
</p>
