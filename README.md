# FlowTrack — Full-Stack Project & Issue Management Platform

[![CI Pipeline](https://github.com/Amrit-2002/FlowTrack/actions/workflows/ci.yml/badge.svg)](https://github.com/Amrit-2002/FlowTrack/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.19-000000?logo=express)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma)](https://www.prisma.io/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-010101?logo=socket.io)](https://socket.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-2.1-729B1B?logo=vitest)](https://vitest.dev/)
[![Playwright](https://img.shields.io/badge/Playwright-1.46-2EAD33?logo=playwright)](https://playwright.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**FlowTrack** is a high-performance, enterprise-grade project management, issue tracking, and collaborative workflow platform built from the ground up as a modern **TypeScript monorepo**. It unites **React 18, Node.js / Express, PostgreSQL (Prisma ORM), and real-time WebSockets (Socket.IO)** to deliver an instantaneous, lag-free collaborative experience.

Engineered with a **Modular Monolith** architecture, FlowTrack features optimistic UI updates, strict workflow state-machine validation, subtask hierarchy, granular work time tracking, file attachment storage, and in-app notification centers.

---

## 🌟 Key Features

- **Executive Analytics Dashboard**: High-level KPI metrics cards, active issue distribution charts (Recharts), bottleneck status detection, top contributor spotlights, and recent activity audit streams.
- **Enterprise Project Workspaces**: Multi-project workspaces with unique keys (`COMM`, `INFRA`), project membership role-based access control (`ADMIN`, `MEMBER`), and client associations.
- **Hierarchical Issue Tracking**: Subtask tree structures, issue priorities (`HIGH`, `MEDIUM`, `LOW`), issue types (`BUG`, `FEATURE`, `TASK`, `IMPROVEMENT`), Markdown descriptions, and custom saved filter views.
- **Interactive Kanban Board**: Drag-and-drop workflow progression with **optimistic UI updates** and instant rollback on failure, backed by strict state-machine transition validation rules.
- **Automated Workflow Engine**: Configurable status transition graph preventing illegal state leaps (e.g., jumping from `To Do` straight to `Done` without review).
- **Rich Discussions & Attachments**: Issue comments with multi-file attachment uploads, download streaming, and author edit permissions.
- **Work Time Logging**: Granular work duration tracking with automatic minutes-to-hours aggregation and per-issue audit logs.
- **Real-Time Collaboration**: Authenticated Socket.IO architecture with project rooms (`project:<id>`), live Kanban updates across concurrent sessions, and targeted personal alerts (`user:<id>`).
- **In-App Notification Center**: Dropdown notification tray with unread badge counter, relative timestamps, type-specific badges, read/unread filters, and deep-link issue navigation.
- **4-Stage Task Pipeline**: Dedicated task delivery tracker for linear stage progression (`Dev` → `Unit Test` → `Staging` → `Prod`) with client associations.
- **Theme Customization**: Fluid dark and light mode system persisted across sessions.

---

## 🏗️ Monorepo Architecture

```
flowtrack/
├── apps/
│   ├── web/                         # React 18 + Vite Frontend SPA (Port 5173)
│   │   ├── src/
│   │   │   ├── components/          # Kanban, Modals, Timeline, TimeLog, NotificationBell
│   │   │   ├── layouts/             # DashboardLayout with Live Sync Topbar & Drawer
│   │   │   ├── pages/               # Dashboard, Projects, Issues, Kanban, Tasks, Clients, Login
│   │   │   ├── services/            # Axios API clients & WebSocket singleton
│   │   │   ├── store/               # Redux Toolkit (client state: auth, theme)
│   │   │   └── hooks/               # useSocket, useProjectSocket, useSocketEvent, useRedux
│   │   └── vercel.json              # Vercel SPA routing rewrite rules & cache headers
│   │
│   └── api/                         # Express.js + TypeScript REST & Socket API (Port 5000)
│       ├── src/
│       │   ├── middleware/          # JWT auth, RBAC guards, Multer upload, Centralized error handling
│       │   ├── modules/             # Modular monolith feature domains
│       │   │   ├── auth/            # Dual-token JWT rotation & bcrypt hashing
│       │   │   ├── projects/        # Project CRUD & membership RBAC
│       │   │   ├── issues/          # Issues, subtasks, and automated activity logging
│       │   │   ├── workflows/       # Directed-graph transition engine
│       │   │   ├── comments/        # Comment threads & file attachment storage
│       │   │   ├── time-logs/       # Work duration logging & aggregation
│       │   │   ├── saved-filters/   # Custom user query views
│       │   │   ├── notifications/   # In-app notification center & unread counters
│       │   │   └── dashboard/       # Aggregated KPI analytics engine
│       │   ├── sockets/             # Authenticated Socket.IO rooms (`project:<id>`, `user:<id>`)
│       │   └── app.ts               # Express application configuration
│       └── prisma/
│           └── schema.prisma        # PostgreSQL schema with relational indexes & soft deletes
│
├── packages/
│   └── shared/                      # Single source of truth for DTOs, Zod schemas & constants
├── e2e/                             # Playwright automated End-to-End test suites
├── docker/                          # Multi-stage Dockerfiles (API + Nginx Web)
├── .github/workflows/ci.yml         # GitHub Actions continuous integration pipeline
├── render.yaml                      # Infrastructure-as-code blueprint for Render
├── docker-compose.yml               # Multi-container orchestration (PostgreSQL 16 + API + Web)
└── LICENSE                          # MIT Open Source License
```

---

## ⚡ Tech Stack & Architectural Decisions

| Layer | Technologies | Architectural Rationale |
| :--- | :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons | Component-driven SPA, sub-second Hot Module Replacement, zero runtime CSS bloat. |
| **State Management** | Redux Toolkit + TanStack Query | Clean separation of concerns: Redux manages client UI state (auth session, theme mode); TanStack Query manages asynchronous server state with intelligent background caching and garbage collection. |
| **Backend** | Node.js 20, Express.js, TypeScript | High-concurrency event-driven architecture, modular structure with thin controllers and typed domain services. |
| **Database & ORM** | PostgreSQL 16, Prisma ORM | Relational integrity, compile-time query type-safety, declarative schema migrations, automated indexes, and connection pooling support. |
| **Real-Time** | Socket.IO | Bi-directional WebSocket communication with fallback polling, JWT handshake authentication, and room-level access control. |
| **Security** | bcrypt, Helmet, CORS, HTTP-only Cookies | Dual-token authentication with refresh token rotation, XSS prevention, and CSRF mitigation. |
| **Testing** | Vitest, Supertest, React Testing Library, Playwright | Comprehensive 3-tier testing pyramid: fast unit tests, API integration tests, and multi-server browser automation. |
| **DevOps** | Docker, Docker Compose, GitHub Actions | Multi-stage container builds, automated CI quality gates, and zero-cost cloud deployment manifests. |

---

## 🚀 Quick Start (Running Locally)

### Prerequisites
- **Node.js**: `v20.x` or `v22.x`
- **PostgreSQL**: Running locally on port `5432` (or via Docker)
- **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/Amrit-2002/FlowTrack.git
cd flowtrack
```

### 2. Install Monorepo Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
FlowTrack includes pre-configured environment configurations for local development:

Inside `apps/api/.env` (and root `.env`):
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:password@localhost:5432/flowtrack?schema=public"
DIRECT_URL="postgresql://postgres:password@localhost:5432/flowtrack?schema=public"
JWT_SECRET="flowtrack_super_secret_jwt_key_at_least_32_characters_long"
JWT_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN="7d"
CORS_ORIGIN="http://localhost:5173"
CLIENT_URL="http://localhost:5173"
STORAGE_PROVIDER="local"
```

Inside `apps/web/.env`:
```env
VITE_API_BASE_URL="http://localhost:5000/api/v1"
VITE_SOCKET_URL="http://localhost:5000"
```

*(Adjust `postgres:password` if your local PostgreSQL password differs).*

### 4. Run Migrations & Seed Sample Data
Execute the database setup command to create tables and populate initial demo data:
```bash
# Generate Prisma Client & apply migrations
npm run db:migrate

# Seed demo users, workflow statuses, projects, issues, comments, and time logs
npm run db:seed
```

### 5. Launch the Application
Start both the backend API and frontend Vite development server concurrently:
```bash
npm run dev
```

- **Frontend App**: Open [http://localhost:5173](http://localhost:5173) in your browser.
- **Backend REST API**: [http://localhost:5000/api/v1](http://localhost:5000/api/v1)
- **Health Check Probe**: [http://localhost:5000/health](http://localhost:5000/health)

---

## 🔑 Pre-Configured Demo Accounts

The database seeder automatically provides 3 accounts with distinct permission tiers:

| Role | Email | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@flowtrack.dev` | `password123` | Full administrative privileges, manage all projects, system users, and global settings |
| **Manager** | `manager@flowtrack.dev` | `password123` | Project manager, create projects, manage project members, assign issues |
| **Developer** | `user@flowtrack.dev` | `password123` | Contributor access, view assigned issues, transition Kanban statuses, log work time |

*(The login screen also provides convenient **one-click demo login buttons** to sign in instantly as any role without typing).*

---

## 🧪 Testing & Quality Assurance

FlowTrack maintains test coverage across the entire stack:

```bash
# Run full unit & integration test suite (154 tests)
npm test

# Run backend API integration tests only (111 tests)
npm --workspace=@flowtrack/api test

# Run frontend React component tests only (43 tests)
npm --workspace=@flowtrack/web test

# Run TypeScript compilation check across all 3 workspaces (0 errors)
npm run typecheck

# Run Playwright End-to-End automated browser tests
npm run test:e2e
```

### Test Coverage Highlights:
- **Backend (`@flowtrack/api`)**: 111 tests across 14 test suites verifying dual-token JWT authentication, RBAC permission guards, workflow transition state rules, comments, multi-file attachments, time logs, activity timelines, notifications, and Socket.IO rooms.
- **Frontend (`@flowtrack/web`)**: 43 tests across 14 test suites verifying auth state, route guards, Kanban optimistic column moves, modals, time tracking, activity history, and real-time notification alerts.
- **End-to-End (`e2e/`)**: 10 Playwright tests verifying full user journeys across login, theme switching, project management, Kanban, and notification drawers.

---

## ☁️ Free-Tier Cloud Deployment

FlowTrack is pre-configured for **100% free-tier** deployment across industry-standard cloud providers:

```
 ┌─────────────────────────────────────────────────────────────┐
 │                       Vercel (Hobby)                        │
 │  React 18 + Vite SPA · Tailwind CSS · Global Edge CDN       │
 │  URL: https://flowtrack-web.vercel.app                      │
 └──────────────┬──────────────────────────────▲───────────────┘
                │                              │
       HTTPS REST API Calls           Real-Time Socket.IO
      (Bearer JWT in Header)         (WebSocket / Polling)
                │                              │
 ┌──────────────▼──────────────────────────────┴───────────────┐
 │                     Render Web Service                      │
 │  Express.js API · Node.js 20 · Socket.IO Server             │
 │  URL: https://flowtrack-api.onrender.com                    │
 └──────────────┬──────────────────────────────────────────────┘
                │
       Prisma Query Engine (PgBouncer Pooled Conn)
 ┌──────────────▼──────────────┐
 │   Neon / Supabase Postgres  │
 │   Free 500MB DB · PG 16     │
 └─────────────────────────────┘
```

### 1. Database (Neon / Supabase)
1. Create a free PostgreSQL instance at [Neon](https://neon.tech) or [Supabase](https://supabase.com).
2. Copy the connection pooling URI into `DATABASE_URL` and direct URI into `DIRECT_URL`.
3. Run `npm run db:migrate` and `npm run db:seed` to initialize the database.

### 2. Backend (Render Web Service)
1. In Render, select **New Blueprint** and connect your repository.
2. Render automatically detects [`render.yaml`](./render.yaml), sets up the Node.js 20 environment, and builds via `npm run build:api`.
3. Set `DATABASE_URL` and `CORS_ORIGIN` in environment variables.
4. Set Health Check Path to `/health`.

### 3. Frontend (Vercel)
1. In Vercel, import the repository and set **Root Directory** to `apps/web`.
2. Configure environment variables:
   - `VITE_API_BASE_URL` = `https://your-api.onrender.com/api/v1`
   - `VITE_SOCKET_URL` = `https://your-api.onrender.com`
3. [`apps/web/vercel.json`](./apps/web/vercel.json) automatically handles SPA catch-all rewrites and asset caching.

---

## 🐳 Docker Deployment

To spin up the entire production stack locally with containerized PostgreSQL:

```bash
# Build and run containers in background
docker-compose up --build -d

# Check status
docker-compose ps

# Access applications:
# Frontend SPA: http://localhost:3000
# Backend API:  http://localhost:5000/api/v1
# Health Check: http://localhost:5000/health

# Stop containers:
docker-compose down
```

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).

Developed with ❤️ by **Amrit Maurya**.
