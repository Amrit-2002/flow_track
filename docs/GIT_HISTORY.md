# FlowTrack — Git Commit Log & Narrative History

This log tracks every Git commit made throughout the incremental development of FlowTrack, including the rationale and files affected.

---

### Commit 1: `chore: initialize repository and clean gitignore`
- **Scope**: Root workspace initialization.
- **Details**: Created root `.gitignore` configured for Node, TypeScript, Vite, Prisma, and environment variable protection.

### Commit 2: `docs: add comprehensive analysis and migration planning documentation`
- **Scope**: Migration planning and architecture.
- **Details**: Added feature inventory, old-to-new mapping, database design, API design, implementation plan, architecture specification, learning guide, and free hosting deployment documentation.

### Commit 3: `chore: initialize TypeScript monorepo with web, api, and shared workspaces`
- **Scope**: Monorepo foundation and npm workspaces.
- **Details**: Created root `package.json` with npm workspaces (`apps/*`, `packages/*`), root `tsconfig.base.json`, `.editorconfig`, `docker-compose.yml` for PostgreSQL 16, `.env.example`, and initialized `@flowtrack/shared` containing all domain constants, DTO types, and Zod validation schemas.

### Commit 4: `feat(db): configure Prisma schema, migrations, and database seeder`
- **Scope**: Database modeling and Prisma ORM configuration.
- **Details**: Configured `apps/api/prisma/schema.prisma` with 14 models (`User`, `Project`, `ProjectMember`, `Status`, `WorkflowTransition`, `Issue`, `Comment`, `Attachment`, `TimeLog`, `Activity`, `Notification`, `SavedFilter`, `RefreshToken`, `Client`, `Task`), created the database seeder (`seed.ts`), initialized the singleton `prisma.ts` client instance, and successfully generated Prisma Client v5.22.

### Commit 5: `feat(api): set up Express application skeleton with health check and error middleware`
- **Scope**: Backend API infrastructure.
- **Details**: Built the Express.js application skeleton with Zod environment validation (`config/env.ts`), structured Pino logging, custom `AppError` hierarchy, centralized error handler with Zod and Prisma error formatting, 404 route handler, `/health` and `/api/v1` base endpoints, Socket.IO server initialization with project/user rooms, graceful shutdown handling, and Vitest integration tests.

### Commit 6: `feat(web): configure Vite, React, Tailwind CSS, and base routing layout`
- **Scope**: Frontend SPA setup and design system layout.
- **Details**: Initialized `@flowtrack/web` with Vite, React 18, Tailwind CSS, Redux Toolkit, and TanStack Query. Built `DashboardLayout` with responsive collapsible sidebar and light/dark theme toggle, `AuthLayout`, core routing (`/dashboard`, `/projects`, `/issues`, `/kanban`, `/tasks`, `/clients`, `/login`, `/register`), JSDOM test setup with `window.matchMedia` mock, and verified with passing Vitest component tests and production build.

### Commit 7: `feat(auth): implement backend JWT authentication, refresh token rotation, and RBAC`
- **Scope**: Backend Authentication, Token Rotation, and User Management.
- **Details**: Implemented dual-token JWT authentication with short-lived (15m) access tokens and durable (7d) refresh token cookies with rotation and replay attack detection. Built `modules/auth/` (register, login, refresh, logout), `modules/users/` (profile update, password change with old password verification, theme preference toggle, account deactivation cascading to tasks/clients), `requireAuth` and `requireRole` middleware, rate-limiting on auth endpoints, and comprehensive Vitest integration tests covering all positive and negative security flows.

### Commit 8: `feat(auth): add frontend authentication pages, state management, and route guards`
- **Scope**: Frontend Authentication, Route Protection, and User Profile.
- **Details**: Connected React frontend to authentication API via Axios client (`services/api.ts`) with request interceptor for Bearer token injection and response interceptor for transparent 401 token refresh queue. Built `ProtectedRoute` for role and authentication guarding, interactive `LoginPage` with React Hook Form + Zod validation and one-click quick demo fill buttons, `RegisterPage` with role selection, `ProfilePage` for identity viewing, name/email update, password change, and light/dark theme persistence, silent session recovery on app mount, and Vitest component tests.

### Commit 9: `feat(projects): implement project management APIs and membership controls`
- **Scope**: Backend Project Management, Authorization, and Membership Lifecycle.
- **Details**: Implemented complete REST endpoints for projects (`GET /api/v1/projects`, `POST /api/v1/projects`, `GET /api/v1/projects/:id`, `PATCH /api/v1/projects/:id`, `DELETE /api/v1/projects/:id`, `POST /api/v1/projects/:id/members`, `DELETE /api/v1/projects/:id/members/:userId`). Enforces strict role-based creation rules (`ADMIN` or `MANAGER`), auto-assigns creator as project `ADMIN`, restricts project updates/deletions and member invitations/removals to project `ADMIN`s, prevents removing the last project admin, cascades member deletions, and verifies tenant isolation through 7 Vitest integration tests.

### Commit 10: `feat(dashboard): add aggregated statistics API for project and issue analytics`
- **Scope**: Backend Dashboard & Project Aggregated Metrics.
- **Details**: Built high-performance aggregated statistics service and endpoint (`GET /api/v1/dashboard/stats`). Supports global system scope for admins/managers and member-scoped project visibility for regular users. Computes issue counts by status, type distribution, top assignee workload, total and average logged time, algorithmic bottleneck status detection, top contributor activity, and recent audit activity timeline. Verified through 5 Vitest integration tests.

### Commit 11: `feat(projects): build project management UI and member management flows`
- **Scope**: Frontend Project Management, Member Directory, and Modal Workflows.
- **Details**: Implemented `projectService` connecting to backend project REST endpoints. Built `ProjectsPage` with TanStack Query caching, keyword search, active/archived workspace toggling, and paginated responsive project cards. Developed `CreateProjectModal` with auto-key generation and Zod validation, `ProjectDetailPage` (`/projects/:id`) with tabbed navigation for team membership and issue backlogs, `AddMemberModal` with role selection (`ADMIN` vs `MEMBER`), and `EditProjectModal` with archive controls. Verified through Vitest component tests and successful Vite production build.

### Commit 12: `feat(dashboard): build dashboard UI with analytics charts and metrics cards`
- **Scope**: Frontend Analytics Dashboard, Recharts Visualizations, and Workload Distribution.
- **Details**: Implemented `dashboardService` connecting to aggregated statistics REST endpoints. Enhanced `DashboardPage` with interactive project scope dropdown selector, KPI stat summary cards (Total Issues, Completed Work with resolution %, Total Logged Time, Top Contributor), intelligent workflow bottleneck alert banner, Recharts bar chart for status column distribution, Recharts donut chart for issue types (Bug, Feature, Task), team workload leaderboard with progress indicators, and recent audit timeline. Verified through Vitest component tests and successful Vite production build.

### Commit 13: `feat(issues): implement issue management, subtask hierarchy, and activity audit APIs`
- **Scope**: Backend Issue Tracking, Subtask Parenting, Search & Filtering, and Activity Auditing.
- **Details**: Built complete RESTful issue management engine (`GET /api/v1/issues`, `POST /api/v1/issues`, `GET /api/v1/issues/:id`, `PATCH /api/v1/issues/:id`, `DELETE /api/v1/issues/:id`). Enforces project membership scoping for standard users, multi-criteria filtering (`statusId`, `priority`, `type`, `assigneeId`, `parentId`, and case-insensitive search), subtask parent validation (cross-project parenting and self-parenting prevention), automated transactional Activity auditing (`CREATED`, `STATUS_CHANGED`, `TITLE_CHANGED`, `PRIORITY_CHANGED`, `TYPE_CHANGED`, `ASSIGNEE_CHANGED`), and deletion permission checks. Verified through 11 Vitest integration tests.

### Commit 14: `feat(tasks): implement legacy task tracker and client management APIs`
- **Scope**: Backend Legacy Task/Bug Tracker & Client Management.
- **Details**: Preserved Laravel's original Client and Task management capabilities by creating dedicated modular APIs for Clients (`/api/v1/clients`) and 4-stage pipeline Tasks (`/api/v1/tasks`). Enforces ownership isolation with global Admin override, date range validation (`startDate <= endDate`), multi-status stages (`devStatus`, `unitTestStatus`, `stagingStatus`, `prodStatus`), soft-deletion with `deletedAt`, and search/pagination. Verified through 12 Vitest integration tests (6 for clients, 6 for tasks). Total 47 passing backend tests.

### Commit 15: `feat(issues): build issue tracking UI with filter toolbar and modal workflows`
- **Scope**: Frontend Issue Management, Filtering Toolbar, and Modal Dialogs.
- **Details**: Built `issueService` and `statusService` connecting to backend issue and board status REST endpoints. Implemented interactive `IssuesPage` with multi-filter toolbar (search by title/description, project dropdown, status dropdown, priority selector, type selector), responsive issue rows with priority badges, status badges, assignee avatars, subtask parent indicators, and inline edit/delete actions. Built `CreateIssueModal` and `EditIssueModal` with dynamic assignee and parent issue loading based on selected project. Verified through Vitest component tests and successful Vite production build.
