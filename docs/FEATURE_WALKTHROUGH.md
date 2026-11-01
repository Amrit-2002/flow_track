# FlowTrack — Feature Walkthrough & Implementation Log

This document records the incremental implementation walkthrough for every completed feature, describing what was built, technical decisions, data flows, and verification steps.

---

## Milestone 1: Discovery, Planning & Repository Initialization
- **Status**: Completed
- **Summary**: Comprehensive inspection of the original Laravel codebase (`https://github.com/Amrit-2002/FlowTrack`), cataloging all models, business rules, controllers, routes, and views. Generated full planning and design specifications.
- **Artifacts Created**:
  - `docs/FEATURE_INVENTORY.md`
  - `docs/OLD_TO_NEW_MAPPING.md`
  - `docs/DATABASE_DESIGN.md`
  - `docs/API_DESIGN.md`
  - `docs/IMPLEMENTATION_PLAN.md`
  - `docs/ARCHITECTURE.md`
  - `docs/LEARNING_GUIDE.md`
  - `docs/IMPORTANT_CONCEPTS.md`
  - `docs/FREE_HOSTING_DEPLOYMENT.md`
  - `docs/FEATURE_WALKTHROUGH.md`
  - `docs/GIT_HISTORY.md`

---

## Milestone 2.1: Monorepo Foundation & Shared Workspace
- **Status**: Completed
- **Summary**: Established the TypeScript monorepo using npm workspaces (`apps/*`, `packages/*`), centralized `tsconfig.base.json`, `.editorconfig`, `.env.example`, and created the `@flowtrack/shared` package.
- **Key Implementation Decisions**:
  - **Shared Zod Schemas**: Auth (`registerSchema`, `loginSchema`), Project (`createProjectSchema`), Issue (`createIssueSchema`, `updateIssueStatusSchema`), TimeLog, Comment, Task, and Client schemas. These allow both the Express API and React forms to share single-source-of-truth validation rules without duplication.
  - **Docker Compose**: Prepared local PostgreSQL 16 container service with persistent volume and health check.
  - **Type Safety**: Defined all DTOs and API standard envelope interfaces (`ApiResponse<T>`, `PaginatedResponse<T>`).
- **Verification**: `@flowtrack/shared` compiled to `dist/` with zero TypeScript errors.

---

## Milestone 2.2: Prisma Schema & Database Seeder
- **Status**: Completed
- **Summary**: Created the full relational PostgreSQL schema in Prisma, configured connection pooling and direct migration URLs, implemented the comprehensive database seeder, and set up the singleton Prisma client instance.
- **Key Implementation Decisions**:
  - **Composite Keys & Referential Integrity**: Enforced `@unique([projectId, userId])` on `ProjectMember` and `@unique([fromStatusId, toStatusId])` on `WorkflowTransition`.
  - **Hierarchy Modeling**: Self-referencing `parentId` on `Issue` models the subtask relationship with `onDelete: SetNull`.
  - **Database Seeder**: Seeds 3 users (Admin, Manager, User), 3 Statuses (To Do, In Progress, Done), 4 Workflow Transitions, 3 Projects (ECOM, CRM, MOBI) with team roles, sample issues with subtasks, comments, time logs, and legacy tasks.
- **Verification**: `npx prisma generate` completed with v5.22.0 client; `npm run typecheck --workspace=@flowtrack/api` passed with zero errors.

---

## Milestone 2.3: Express Server Skeleton & Core Middleware
- **Status**: Completed
- **Summary**: Created the Express API foundation, environment configuration validator with Zod, structured logging via Pino, centralized error handler, 404 handler, health checks, Socket.IO hub, and Vitest test suite.
- **Key Implementation Decisions**:
  - **Health Monitoring for Free Tier**: Dedicated `/health` endpoint configured to satisfy Render cold-start and readiness probes without database overhead.
  - **Robust Error Envelope**: Centralized error middleware captures `AppError`, `ZodError` (maps field paths to messages), and Prisma client errors (`P2002` duplicate key, `P2025` missing record), ensuring consistent JSON error shapes across all endpoints.
  - **Graceful Shutdown**: Catches `SIGTERM` and `SIGINT`, closes HTTP connections, safely disconnects Prisma, and forces exit after 10s timeout.
- **Verification**: All 3 Vitest integration tests passed (`app.test.ts`); TypeScript typecheck passed cleanly.

---

## Milestone 2.4: React SPA Skeleton & Dashboard Layout
- **Status**: Completed
- **Summary**: Created the React 18 single page application with Vite, Tailwind CSS, Redux Toolkit, and TanStack Query. Built the responsive `DashboardLayout` with light/dark theme toggle, navigation links, and placeholder views.
- **Key Implementation Decisions**:
  - **Theme Persistence**: `themeSlice` syncs with `localStorage` and toggles `.dark` on `document.documentElement` immediately to eliminate visual flash.
  - **Client vs Server State Separation**: Redux Toolkit manages UI theme and auth token; TanStack Query manages server caching.
  - **Testing Reliability**: Added `window.matchMedia` mock in JSDOM setup for reliable component testing.
- **Verification**: Vitest component test passed (`DashboardLayout.test.tsx`); `npm run typecheck` passed with 0 errors; Vite production build completed in 9.77s.

---

## Milestone 3.1: Backend Authentication, Refresh Token Rotation & RBAC
- **Status**: Completed
- **Summary**: Built complete user authentication, durable session management, password hashing, and role authorization.
- **Key Implementation Decisions**:
  - **Replay Attack Neutralization**: If an already-revoked refresh token is re-used (e.g. intercepted by an attacker), all active sessions for that user account are revoked immediately, logging out all devices.
  - **Dual-Token Lifetime**: 15-minute JWT access token in memory for rapid verification; 7-day SHA-256 hashed refresh token in HTTP-only, secure, SameSite cookie.
  - **Parity with Laravel ProfileController**: Account deactivation explicitly deletes associated tasks and clients before setting `deletedAt`, maintaining referential integrity.
- **Verification**: 12 Vitest tests passing in `apps/api` (`auth.test.ts` and `app.test.ts`); TypeScript typecheck passed with zero errors.

---

## Milestone 3.2: Frontend Authentication, State Management & Route Guards
- **Status**: Completed
- **Summary**: Connected the React frontend to the backend authentication and user profile APIs.
- **Key Implementation Decisions**:
  - **Transparent Token Refresh Queue**: Implemented in Axios interceptors (`services/api.ts`). When an access token expires (401), pending requests are queued while `/auth/refresh` rotates the token using the HTTP-only cookie, seamlessly retrying the failed requests without interrupting the user.
  - **Route Protection**: `ProtectedRoute` checks authentication and role permissions before rendering workspace layouts, displaying a non-intrusive loading state during silent cookie verification.
  - **Interview & Showcase Friendly**: `LoginPage` includes one-click quick-fill buttons for demo credentials (Admin, Manager, User).
  - **Profile Management**: Built `ProfilePage` for updating personal details, changing password with current password verification, and switching light/dark theme with instant DOM and database synchronization.
- **Verification**: 4 Vitest component tests passing in `apps/web` (`LoginPage.test.tsx` and `DashboardLayout.test.tsx`); Vite production build succeeded in 9.39s; TypeScript typecheck passed cleanly.

---

## Milestone 4.1: Backend Project Management & Membership Access Controls
- **Status**: Completed
- **Summary**: Built complete project lifecycle APIs, project membership management, and granular permission enforcement preserving Laravel's original authorization policies.
- **Key Implementation Decisions**:
  - **Granular Project Authorization**: Only global `ADMIN` or `MANAGER` can create projects. When created, the creator is automatically added as a `ProjectMember` with `ADMIN` role.
  - **Resource Security**: Project modification, deletion, and member additions/removals are strictly guarded: only project `ADMIN`s (or global system `ADMIN`s) can perform administrative operations. Project viewing (`GET /projects/:id`) is strictly restricted to project members or global admins.
  - **Deadlock & Orphan Prevention**: An admin cannot remove the last project `ADMIN` from a project, ensuring projects never become unmanageable orphans.
  - **Search & Pagination**: Project listing supports case-insensitive name/key filtering and cursor/offset pagination.
- **Verification**: 7 comprehensive Vitest integration tests in `apps/api/src/modules/projects/project.test.ts` testing project creation, listing, unauthorized viewing rejection (403), duplicate member rejection (409), and removing last admin prevention (400). Total 19 backend tests passing. TypeScript typecheck passed cleanly.

---

## Milestone 4.2: Backend Dashboard Analytics & Aggregated Metrics API
- **Status**: Completed
- **Summary**: Implemented the aggregated statistics service and REST endpoint (`GET /api/v1/dashboard/stats`) calculating real-time operational metrics across projects or scoped to individual projects.
- **Key Implementation Decisions**:
  - **Dynamic Tenant & Project Scoping**: If `?projectId=` is provided, checks user project membership (or global `ADMIN` status) before returning project metrics; if omitted, `ADMIN` and `MANAGER` receive organization-wide statistics, while standard `USER` accounts receive aggregated metrics strictly for projects they are assigned to.
  - **Prisma Aggregations & GroupBy**: Utilized Prisma `groupBy` queries for `statusId`, `type`, and `assigneeId`, alongside `prisma.timeLog.aggregate({ _sum: { timeSpent: true } })` to compute totals and averages with minimal database queries.
  - **Bottleneck Detection**: Identifies the workflow status harboring the highest density of unresolved work by excluding terminal statuses ('Done', 'Closed', 'Completed') and sorting backlog density.
  - **Recent Activity Audit Feed**: Returns the top 10 recent issue audit actions with actor details.
- **Verification**: 5 Vitest integration tests in `apps/api/src/modules/dashboard/dashboard.test.ts` testing auth guard (401), non-existent project (404), unauthorized member access (403), admin organization-wide calculations, and authorized project scoping. Total 24 backend tests passing. TypeScript typecheck passed cleanly.
