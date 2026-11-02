# FlowTrack — Modern Full-Stack Project & Issue Management Platform

[![CI Pipeline](https://github.com/Amrit-2002/FlowTrack/actions/workflows/ci.yml/badge.svg)](https://github.com/Amrit-2002/FlowTrack/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.19-000000?logo=express)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.18-2D3748?logo=prisma)](https://www.prisma.io/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-010101?logo=socket.io)](https://socket.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-2.1-729B1B?logo=vitest)](https://vitest.dev/)
[![Playwright](https://img.shields.io/badge/Playwright-1.46-2EAD33?logo=playwright)](https://playwright.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**FlowTrack** is a production-grade, commercial-quality project management, issue tracking, and collaborative workflow platform. Originally developed in Laravel 11 / Blade / MySQL, it has been completely re-architected and migrated into a high-performance **TypeScript monorepo** powered by **React 18, Express.js, PostgreSQL (Prisma ORM), and real-time WebSockets (Socket.IO)**.

Designed for 100% free-tier cloud deployment across **Vercel** (Frontend SPA), **Render** (Node.js API), and **Neon / Supabase** (Serverless PostgreSQL).

---

## 🌟 Key Features

- **Executive Analytics Dashboard**: High-level KPI metrics, active issue distribution charts (Recharts), bottleneck status detection, top contributor spotlights, and recent project activity audit streams.
- **Enterprise Project Management**: Multi-project workspaces with unique keys (`COMM`, `INFRA`), project membership role-based access control (`ADMIN`, `MEMBER`), and client associations.
- **Hierarchical Issue Tracking**: Subtask tree structures, issue priorities (`HIGH`, `MEDIUM`, `LOW`), issue types (`BUG`, `FEATURE`, `TASK`, `IMPROVEMENT`), Markdown descriptions, and custom saved filter views.
- **Interactive Kanban Board**: Drag-and-drop workflow progression with **optimistic UI updates** and instant rollback on failure, backed by strict state-machine transition validation rules.
- **Automated Workflow Engine**: Configurable status transition graph preventing illegal state leaps (e.g., jumping from `To Do` straight to `Done` without review).
- **Rich Discussions & Attachments**: Issue comments with multi-file attachment uploads, download streaming, and author edit permissions.
- **Work Time Logging**: Granular work duration tracking with automatic minutes-to-hours aggregation and per-issue audit logs.
- **Real-Time Collaboration**: Authenticated Socket.IO architecture with project rooms (`project:<id>`), live Kanban updates across concurrent sessions, and targeted personal alerts (`user:<id>`).
- **In-App Notification Center**: Dropdown notification tray with unread badge counter, relative timestamps, type-specific badges, read/unread filters, and deep-link issue navigation.
- **Legacy 4-Stage Task Tracker**: Preserved from the original Laravel application for linear delivery monitoring (`Dev` → `Unit Test` → `Staging` → `Prod`) with client tracking.
- **Theme Customization**: Fluid dark and light mode system persisted across sessions.

---

## 🏗️ System Architecture

FlowTrack follows a **Modular Monolith** architecture within an npm workspaces monorepo:

```
flowtrack/
├── apps/
│   ├── web/                     # React 18 + Vite Frontend SPA
│   │   ├── src/
│   │   │   ├── components/      # UI components (Kanban, Modals, Timeline, Notifications)
│   │   │   ├── layouts/         # Responsive Dashboard Layout with Live Sync Topbar
│   │   │   ├── pages/           # Route views (Dashboard, Projects, Issues, Kanban, Tasks, Clients)
│   │   │   ├── services/        # Axios API clients & WebSocket singleton
│   │   │   ├── store/           # Redux Toolkit client state (auth, theme)
│   │   │   └── hooks/           # Custom React hooks (useSocket, useProjectSocket, useRedux)
│   │   └── vercel.json          # Vercel SPA routing rewrite rules
│   │
│   └── api/                     # Node.js + Express + TypeScript Backend
│       ├── src/
│       │   ├── middleware/      # JWT auth, RBAC guards, Multer upload, Error handler
│       │   ├── modules/         # Domain feature modules (Thin controllers, Fat services)
│       │   │   ├── auth/        # Dual-token JWT rotation & bcrypt hashing
│       │   │   ├── projects/    # Project CRUD & membership RBAC
│       │   │   ├── issues/      # Issues, subtasks, and activity logger
│       │   │   ├── workflows/   # Directed-graph transition engine
│       │   │   ├── comments/    # Comment threads & attachment handling
│       │   │   ├── time-logs/   # Work duration logging & aggregation
│       │   │   ├── saved-filters/# Custom user query views
│       │   │   ├── notifications/# Notification center & unread counts
│       │   │   └── dashboard/   # Aggregated analytics query engine
│       │   ├── sockets/         # Authenticated Socket.IO rooms & event dispatchers
│       │   └── app.ts           # Express application setup
│       └── prisma/
│           └── schema.prisma    # PostgreSQL database schema & relations
│
├── packages/
│   └── shared/                  # Common TypeScript interfaces, Zod schemas & constants
├── e2e/                         # Playwright End-to-End test suites
├── docker/                      # Multi-stage Dockerfiles & Nginx configurations
├── .github/workflows/           # Automated GitHub Actions CI pipeline
├── render.yaml                  # Render Cloud blueprint
└── docker-compose.yml           # Local multi-container development orchestration
```

---

## 🔄 Technology Comparison: Laravel 11 vs. React / Node Stack

| Dimension | Original Laravel 11 Stack | Migrated Modern Stack | Architectural Benefit |
| :--- | :--- | :--- | :--- |
| **Frontend** | Blade Templates + Alpine.js | React 18 + TypeScript + Vite | Component modularity, rich interactivity, static edge hosting on Vercel CDN |
| **Backend** | PHP 8.2 + Laravel Framework | Node.js + Express.js + TypeScript | Non-blocking event loop, unified language across stack, native WebSocket support |
| **State Management** | Full-page reloads / Alpine state | Redux Toolkit + TanStack Query | Client state vs server state separation, background caching, optimistic UI |
| **Database ORM** | Eloquent (Active Record) | Prisma ORM (Data Mapper pattern) | Compile-time type-safety, auto-generated migrations, strict foreign key constraints |
| **Real-Time** | Laravel Echo + Pusher (paid tier) | Native Socket.IO + Express | Zero-cost self-hosted WebSockets, room-based security, instant bidirectional events |
| **Styling** | Tailwind CSS CDN | Tailwind CSS + Lucide React + shadcn UI | Tree-shaken CSS bundle, accessible modern UI components, fluid dark mode |
| **Testing** | Pest PHP | Vitest + React Testing Library + Playwright | 154 unit/integration tests + 10 E2E tests, sub-second test execution |

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- **Node.js**: `v20.x` or higher
- **PostgreSQL**: `v16.x` running locally on port 5432 (or Docker)
- **Git**

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Amrit-2002/FlowTrack.git
cd flowtrack

# Install dependencies across all monorepo workspaces
npm install
```

### 2. Configure Environment Variables
Create `.env` inside `apps/api`:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:password@localhost:5432/flowtrack?schema=public"
JWT_ACCESS_SECRET="flowtrack_super_secret_access_jwt_key_2026_dev_min32chars"
JWT_REFRESH_SECRET="flowtrack_super_secret_refresh_jwt_key_2026_dev_min32chars"
ACCESS_TOKEN_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN="7d"
CORS_ORIGIN="http://localhost:5173"
```

Create `.env` inside `apps/web`:
```env
VITE_API_URL="http://localhost:5000/api/v1"
VITE_WS_URL="http://localhost:5000"
```

### 3. Database Migration & Seeding
```bash
# Generate Prisma Client
npm run db:generate

# Apply database migrations
npm run db:migrate

# Seed demo users, workflow statuses, and sample tickets
npm run db:seed
```

### 4. Start Development Servers
```bash
# Starts both Backend API (port 5000) and Frontend Web (port 5173) in parallel
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

---

## 🔑 Demo Login Credentials

The database seeder automatically provides 3 pre-configured demo user accounts:

| Role | Email | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@flowtrack.dev` | `password123` | Full system access, all projects, user management, project creation |
| **Manager** | `manager@flowtrack.dev` | `password123` | Project lead, create projects, manage project members, assign issues |
| **Developer** | `user@flowtrack.dev` | `password123` | Project contributor, view assigned issues, transition statuses, log time |

*(One-click demo login buttons are provided on the login page for instant access without typing credentials).*

---

## 🧪 Comprehensive Quality Assurance & Testing

The repository maintains strict test coverage across unit, integration, and end-to-end tiers:

```bash
# Run all 154 unit & integration test suites
npm test

# Run backend API tests only (111 tests)
npm --workspace=@flowtrack/api test

# Run frontend Web tests only (43 tests)
npm --workspace=@flowtrack/web test

# Run TypeScript compile validation across all workspaces (0 errors)
npm run typecheck

# Run Playwright End-to-End test suites
npm run test:e2e
```

### Test Suite Summary:
- **Backend (`@flowtrack/api`)**: 111 tests across 14 test suites verifying JWT rotation, RBAC enforcement, workflow state transitions, comments, attachments, time logs, activity timelines, notifications, and real-time Socket.IO rooms.
- **Frontend (`@flowtrack/web`)**: 43 tests across 14 test suites verifying auth state, route guards, Kanban optimistic updates, modals, time tracking, activity history, and notification tray reactivity.
- **End-to-End (`e2e/`)**: 10 Playwright tests verifying complete user journeys across multi-server environments.

---

## ☁️ Free-Tier Cloud Deployment

FlowTrack is optimized for zero-cost deployment:

1. **Database**: [Neon](https://neon.tech) / [Supabase](https://supabase.com) (Serverless PostgreSQL with connection pooling).
2. **Backend**: [Render](https://render.com) Web Service with blueprint configuration via [`render.yaml`](./render.yaml).
3. **Frontend**: [Vercel](https://vercel.com) Edge Network with SPA routing rules via [`vercel.json`](./apps/web/vercel.json).

For complete step-by-step deployment instructions, refer to **[docs/FREE_HOSTING_DEPLOYMENT.md](./docs/FREE_HOSTING_DEPLOYMENT.md)**.

---

## 🐳 Docker Deployment

Run the complete multi-container production stack locally with a single command:

```bash
docker-compose up --build -d
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000/api/v1`
- Health Probe: `http://localhost:5000/health`

---

## 📚 Technical Documentation & Interview Guides

- **[Architecture Deep-Dive](./docs/ARCHITECTURE.md)**: Modular monolith structure, data flow, and real-time WebSocket room design.
- **[Database Design](./docs/DATABASE_DESIGN.md)**: PostgreSQL schema, relational integrity, indexes, and ER diagrams.
- **[API Specification](./docs/API_DESIGN.md)**: Complete REST endpoint documentation and response schemas.
- **[Laravel to Node/React Migration Mapping](./docs/OLD_TO_NEW_MAPPING.md)**: Detailed mapping of original Laravel models, controllers, and Blade templates to modern equivalents.
- **[Learning Guide](./docs/LEARNING_GUIDE.md)**: Architectural patterns, ORM comparison, and dual-token authentication mechanics.
- **[Interview Talking Points](./docs/IMPORTANT_CONCEPTS.md)**: Senior engineering discussion points, system tradeoffs, and scalability considerations.
- **[Feature Walkthrough](./docs/FEATURE_WALKTHROUGH.md)**: Exhaustive walkthrough of every migrated feature.
- **[Git Commit History](./docs/GIT_HISTORY.md)**: Chronological narrative of all 30+ atomic milestone commits.

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).

Developed with ❤️ by **Amrit Maurya**.
