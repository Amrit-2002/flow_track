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

### Commit 16: `feat(tasks): build legacy task tracker and client management UI`
- **Scope**: Frontend Task Delivery Tracker, 4-Stage Pipeline Table, and Client Directory.
- **Details**: Built typed client services (`clientService`, `taskService`) connecting to backend endpoints. Implemented interactive `TasksPage` featuring full tabular view tracking features across all 4 delivery stages (Development, Unit Testing, Staging, Production) with distinctive color-coded status badges, multi-criteria filtering (search, client, dev status, priority), and paginated navigation. Created `CreateTaskModal` and `EditTaskModal` with dynamic client autocomplete, date validation, and responsive form controls. Built `ClientsPage` directory with card grid, inline client creation, editing, and deletion modal workflows. Verified through Vitest component tests and successful Vite production build.

### Commit 17: `feat(workflows): implement workflow status transition validation engine`
- **Scope**: Backend Workflow State Machine, Transition Validation, and Quick Status Transition API.
- **Details**: Built dedicated `modules/workflows/` (`workflow.service.ts`, `workflow.controller.ts`, `workflow.routes.ts`) providing endpoints for workflow statuses (`GET /api/v1/workflows/statuses`), allowed transition matrix (`GET /api/v1/workflows/transitions`), transition validation (`POST /api/v1/workflows/validate`), and administrative transition lifecycle management (`POST /api/v1/workflows/transitions`, `DELETE /api/v1/workflows/transitions/:id`). Added `validateRequest` validation middleware. Integrated state machine validation into `issue.service.ts` (`transitionIssue` and `updateIssue`), enforcing workflow transitions with HTTP 422 `INVALID_WORKFLOW_TRANSITION` on illegal moves (e.g. `To Do` directly to `Done`) while logging transactional `Activity` history on valid state advances. Added dedicated `PATCH /api/v1/issues/:id/status` and `POST /api/v1/issues/:id/transition` endpoints for Kanban updates. Verified through 12 new Vitest integration tests (59 passing backend tests, 73 total monorepo tests).

### Commit 18: `feat(comments): add comment discussions and file attachment storage`
- **Scope**: Backend Issue Discussion Comments, Notification Triggers, and Multer Object Storage.
- **Details**: Built dedicated `modules/comments/` (`comment.service.ts`, `comment.controller.ts`, `comment.routes.ts`) and `modules/attachments/` (`storage.service.ts`, `attachment.service.ts`, `attachment.controller.ts`, `attachment.routes.ts`). Implemented disk/cloud storage abstraction using Multer with strict filetype allowlists and 10MB limits, serving uploads via static express routes and download stream endpoints (`GET /api/v1/attachments/:id/download`). Supported comment creation with multi-file attachment linkage, automatic transactional `Activity` auditing (`COMMENT_ADDED`), and intelligent in-app `Notification` generation for issue assignees and reporters. Enforced author/admin ownership guards on comment updates and deletions with automatic attachment disk cleanup. Verified through 13 new Vitest integration tests (72 passing backend tests, 86 total monorepo tests).

### Commit 19: `feat(kanban): build interactive Kanban board with optimistic status updates`
- **Scope**: Frontend Interactive Kanban Board, Drag-and-Drop, and Optimistic Transition Rollbacks.
- **Details**: Built `workflow.service.ts` for status and transition matrix queries. Implemented interactive `KanbanBoardPage` featuring dynamic workflow columns with color accents and real-time counter pills, HTML5 native drag-and-drop card movement, project scope filtering, and permitted quick-transition action buttons. Built TanStack Query optimistic mutation updates with automatic rollback snapshot restoration and user-friendly error banners upon invalid state transitions (HTTP 422). Added column-specific issue creation triggers linking to `CreateIssueModal`. Verified through Vitest component tests and successful Vite production build.

### Commit 20: `feat(issues): build comprehensive issue detail view with comments and attachments`
- **Scope**: Frontend Issue Detail View, Discussion Threads, and File Attachments.
- **Details**: Built typed client services `commentService` and `attachmentService` for comment CRUD and multipart file upload handling. Implemented comprehensive `IssueDetailPage` (`/issues/:id`) featuring two-column responsive layout, breadcrumb navigation, live workflow state machine status transition controls with blocked-transition warning alerts, child subtask directory with quick "+ Add Subtask" modal workflow, rich discussion comments feed with author avatars, inline editing, and deletion controls, and multipart file attachment upload dropzone with download streaming and delete safeguards. Updated `issue.service.ts` to include attachments in issue queries. Verified through Vitest component tests and successful Vite production build.

### Commit 21: `feat(time-tracking): implement work time logging and aggregation`
- **Scope**: Work Time Logging, Duration Aggregation, Activity Auditing, and Modal Workflow.
- **Details**: Built backend `modules/time-logs/` (`time-log.service.ts`, `time-log.controller.ts`, `time-log.routes.ts`) providing endpoints for time logs (`GET /api/v1/issues/:issueId/time-logs`, `POST /api/v1/issues/:issueId/time-logs`, `DELETE /api/v1/time-logs/:id`). Validated input via `createTimeLogSchema`, enforced project membership and author/admin deletion permissions, aggregated total spent minutes across work entries, and recorded atomic `Activity` audits (`TIME_LOGGED`, `TIME_LOG_DELETED`). On frontend, built `timeLogService`, interactive `LogTimeModal` with live hours/minutes calculation and validation, and `TimeLogSection` in `IssueDetailPage` displaying total work duration, entry counts, formatted author/date cards, and deletion workflows. Added 11 new Vitest backend integration tests and 5 new frontend component tests (83 passing backend tests, 23 passing frontend tests, 106 monorepo tests total).

### Commit 22: `feat(activity): implement automated issue change history and audit timeline`
- **Scope**: Issue Change History, Audit Trail Feed, and Visual Timeline UI.
- **Details**: Built backend `modules/activities/` (`activity.service.ts`, `activity.controller.ts`) and exposed endpoints for issue audit trails (`GET /api/v1/issues/:id/activities`) and project activity feeds (`GET /api/v1/projects/:id/activities`). Enforced project-level authorization across queries. On frontend, built `activityService`, `ActivityTimeline` component featuring action-specific badge icons, relative timestamps, and diff descriptions (`STATUS_CHANGED`, `PRIORITY_CHANGED`, `ASSIGNED`, `TIME_LOGGED`, `TIME_LOG_DELETED`, `COMMENT_ADDED`, `ATTACHMENT_ADDED`), and integrated tab navigation (`Comments` vs `Activity History`) into `IssueDetailPage`. Added 8 new Vitest backend integration tests and 4 new frontend component tests (91 passing backend tests, 27 passing frontend tests, 118 monorepo tests total).
