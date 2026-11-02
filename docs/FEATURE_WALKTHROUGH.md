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

---

## Milestone 4.3: Frontend Project Management UI & Team Administration
- **Status**: Completed
- **Summary**: Delivered end-to-end frontend interfaces for browsing, creating, inspecting, and managing projects and project member assignments.
- **Key Implementation Decisions**:
  - **Service Architecture**: `project.service.ts` encapsulates all REST calls with proper TypeScript generic typings (`PaginatedResponse<ProjectDTO>`, `ApiResponse<ProjectMemberDTO>`).
  - **Interactive Creation**: `CreateProjectModal` features auto-generating project keys (e.g. "Customer Portal" -> "CP") that are enforced uppercase and validated with `createProjectSchema`.
  - **Project Detail Navigation**: Built dedicated route `/projects/:id` in `AppRoutes.tsx` with breadcrumbs, role-based action buttons (Settings and Delete hidden from non-admin members), and tabs separating Team Members from the Issues Backlog.
  - **Member Administration**: `AddMemberModal` enables inviting users with assigned role (`ADMIN` or `MEMBER`), and project admins can remove members with confirmation safeguards.
- **Verification**: 2 new Vitest component tests in `ProjectsPage.test.tsx` verifying project cards rendering, key badges, member counts, and empty states. 6 total web tests passing. TypeScript typecheck passed with 0 errors; Vite production build completed in 12.58s.

---

## Milestone 4.4: Frontend Dashboard UI, Visual Charts & Workload Analytics
- **Status**: Completed
- **Summary**: Transformed placeholder dashboard into a rich, data-driven operational intelligence hub displaying velocity metrics, workflow status bars, issue type distributions, bottleneck warnings, and team workloads.
- **Key Implementation Decisions**:
  - **Dynamic Scope Filtering**: Integrated project selector dropdown allowing managers to view organization-wide metrics or isolate specific projects.
  - **Recharts Data Visualization**: Implemented responsive BarChart mapping stage column density with customized color coding matching board states, alongside a centered DonutChart showing Bug/Feature/Task distribution.
  - **Actionable Bottleneck Detection**: Automatically renders an amber attention banner when a non-terminal status holds disproportionate backlog volume, providing teams with direct visibility into throughput friction.
  - **Audit Timeline & Workload Leaderboard**: Displays top assignees with percentage progress bars and real-time activity changes with actor names and timestamps.
- **Verification**: Component test in `DashboardPage.test.tsx` verifying KPI metrics, bottleneck banner, project selector, and Recharts container rendering. Total 7 web tests and 24 API tests passing. TypeScript typecheck passed cleanly across all workspaces.

---

## Milestone 5.1: Backend Issue Management & Subtask Hierarchy Engine
- **Status**: Completed
- **Summary**: Implemented the central issue tracker module, supporting story/task/bug workflows, hierarchical parent-child subtask relationships, multi-criteria filtering, full-text search, and automated activity audit logging.
- **Key Implementation Decisions**:
  - **Granular Scoping & Tenant Security**: Standard `USER` accounts can only query and manipulate issues belonging to projects where they hold active membership.
  - **Relational Subtask Integrity**: Validates that child subtasks belong to the exact same `projectId` as their parent issue, preventing cross-tenant project leakage, and prevents circular parenting (`parentId !== id`).
  - **Transactional Activity Auditing**: Modifications to issue status, title, priority, type, or assignee atomically record historical `Activity` records in Prisma `$transaction`, establishing a permanent audit trail for boards and feeds.
  - **Search & Multi-Filter Query Engine**: Supports concurrent filtering by status, priority, type, assignee, top-level vs subtask parenting (`parentId=null`), and case-insensitive search across title and description with pagination.
- **Verification**: 11 Vitest integration tests in `apps/api/src/modules/issues/issue.test.ts` covering CRUD operations, project membership enforcement (403), cross-project subtask rejections (400), self-parenting prevention (400), and unauthorized deletion rejections (403). Total 35 backend tests passing. Monorepo typecheck passed cleanly with 0 errors.

---

## Milestone 5.2: Backend Legacy Task Tracker & Client Management API
- **Status**: Completed
- **Summary**: Implemented the legacy Task and Client modules preserving the original Laravel functionality (`TaskController` and `ClientController`), providing a specialized 4-stage pipeline for tasks with client associations.
- **Key Implementation Decisions**:
  - **Ownership Scoping & Soft Deletions**: Regular users access and manage their own clients and tasks, while administrators have system-wide visibility. Deletions apply `deletedAt: new Date()` to protect historical integrity.
  - **4-Stage Pipeline Tracking**: Preserves individual tracking across Development, Unit Testing, Staging, and Production stages (`New`, `In-progress`, `Completed`, `On-hold`, `NA`).
  - **Date Validation**: Enforces `startDate <= endDate` at both the Zod validation layer and service layer.
- **Verification**: 12 Vitest integration tests (6 in `apps/api/src/modules/clients/client.test.ts` and 6 in `apps/api/src/modules/tasks/task.test.ts`) covering CRUD, ownership isolation, date validation, and soft deletions. Total 47 backend tests passing. Monorepo typecheck passed with 0 errors.

---

## Milestone 5.3: Frontend Issue Management UI & Multi-Filter Backlog
- **Status**: Completed
- **Summary**: Delivered end-to-end frontend interfaces for managing project issues and subtasks with real-time filtering, search, and responsive editing workflows.
- **Key Implementation Decisions**:
  - **Dynamic Multi-Filter Toolbar**: Supports combined filtering across projects, statuses, priorities, types, and keyword search with TanStack Query caching and automatic pagination resets.
  - **Context-Aware Modal Dialogs**: `CreateIssueModal` dynamically fetches members of the chosen project for the assignee dropdown, and fetches existing top-level issues in that project so users can seamlessly create subtasks.
  - **Direct CRUD Workflows**: Issues list provides immediate modal triggers for editing titles, priorities, and descriptions, alongside safe deletion with confirmation dialogs.
- **Verification**: Component test in `IssuesPage.test.tsx` verifying filter toolbar, issue rows, priority badges, and empty states. 9 web tests and 47 backend tests passing (56 total monorepo tests). Vite production build succeeded in 8.08s. Monorepo typecheck passed cleanly with 0 errors.

---

## Milestone 5.4: Frontend Legacy Task Delivery Tracker & Client Directory
- **Status**: Completed
- **Summary**: Delivered complete user interfaces for the 4-stage pipeline Task Delivery Tracker and Client Directory, fulfilling 100% parity with Laravel's original delivery workflows.
- **Key Implementation Decisions**:
  - **Tabular 4-Stage Matrix View**: `TasksPage.tsx` displays tasks in a clear tabular grid displaying individual progress columns for Development, Unit Testing, Staging, and Production stages with color-coded status badges (`New`, `In-progress`, `Completed`, `On-hold`, `NA`).
  - **Multi-Filter & Pagination Controls**: Filter by search query, client name, dev status, and priority with automatic page resets and pagination controls.
  - **Task Modal Workflows**: `CreateTaskModal.tsx` and `EditTaskModal.tsx` feature client datalist autocomplete, start/end date validation, 4-stage status pickers, and owner assignments.
  - **Client Management Directory**: `ClientsPage.tsx` provides clean client card layout with inline add, rename, and delete dialogs.
- **Verification**: Vitest component tests in `TasksPage.test.tsx` and `ClientsPage.test.tsx` verifying 4-stage status badges, client cards, and modal triggers. 14 web tests and 47 backend tests passing (61 total monorepo tests). Vite production build succeeded with 0 errors. Monorepo typecheck passed cleanly.

---

## Milestone 6.1: Workflow Status Transition Validation Engine
- **Status**: Completed
- **Summary**: Implemented configurable workflow status transitions with a robust state machine engine enforcing valid issue transitions, preventing illegal status skips, and tracking status change history.
- **Key Implementation Decisions**:
  - **Modular Workflow Engine**: Created `modules/workflows/` with `WorkflowService`, `WorkflowController`, and `workflowRouter` exposing `/api/v1/workflows/statuses`, `/api/v1/workflows/transitions`, and `/api/v1/workflows/validate`.
  - **Strict State Machine Enforcement**: Transitions validate against the `workflow_transitions` relationship matrix. Illegal transitions (e.g. `To Do` directly to `Done` skipping `In Progress`) are rejected with HTTP 422 `INVALID_WORKFLOW_TRANSITION`.
  - **Atomic Transaction & Audit Logging**: Permitted status changes atomically record an `Activity` audit entry (`action: 'STATUS_CHANGED'`, `oldValue`, `newValue`) in Prisma `$transaction`.
  - **Fast Quick-Status Transition API**: Added dedicated `PATCH /api/v1/issues/:id/status` (and `POST /api/v1/issues/:id/transition` alias) optimized for agile Kanban drag-and-drop operations with project membership and role checks.
- **Verification**: 12 Vitest integration tests in `apps/api/src/modules/workflows/workflow.test.ts` testing auth checks (401), membership permissions (403), transition matrix validation, illegal status skip rejection (422), valid status transitions (200), and admin transition creation/deletion. 59 total API tests and 14 Web tests passing (73 total monorepo tests). Monorepo typechecks pass cleanly.

---

## Milestone 6.2: Issue Comment Discussions & File Attachment Storage
- **Status**: Completed
- **Summary**: Implemented rich issue discussion threads, automated in-app notification dispatching, and secure multipart file upload storage.
- **Key Implementation Decisions**:
  - **Modular Comment Architecture**: Created `modules/comments/` with `CommentService`, `CommentController`, and `commentRouter` managing comment threads with author profiles and attached files.
  - **Multipart Storage Abstraction**: Built `StorageService` using Multer for processing file uploads with 10MB limits, dangerous extension protection, local disk streaming via `express.static('/uploads')`, and dedicated download streams (`GET /api/v1/attachments/:id/download`).
  - **In-App Notification Dispatch**: Adding a comment atomically generates in-app `Notification` records for issue assignees and reporters (excluding the comment author) alongside transactional `Activity` auditing (`COMMENT_ADDED`).
  - **Granular Ownership & Cascade Deletion**: Enforces strict author/admin permissions on comment edits and deletions, cleaning up physical storage files on disk when attachments or comments are removed.
- **Verification**: 13 Vitest integration tests in `apps/api/src/modules/comments/comment.test.ts` verifying authentication (401), project authorization (403), notification triggers, author edit/delete guards, and attachment upload/download/deletion flows. 72 total API tests and 14 Web tests passing (86 total monorepo tests). Monorepo typechecks pass cleanly.

---

## Milestone 6.3: Interactive Kanban Board with Optimistic Status Updates
- **Status**: Completed
- **Summary**: Delivered dynamic drag-and-drop Kanban board supporting real-time workflow column rendering, optimistic UI state transitions, and automatic snapshot rollback on rejected transitions.
- **Key Implementation Decisions**:
  - **State-Driven Workflow Columns**: `KanbanBoardPage.tsx` dynamically queries `/workflows/statuses` to construct column lanes with color-coded status badges and item counters.
  - **HTML5 Drag-and-Drop Experience**: Cards are draggable across columns with visual drop target highlighting, capturing dragged issues and executing instant transitions on release.
  - **Optimistic State Updates & Rollback**: Uses TanStack Query `useMutation` with `onMutate` to immediately render the card in the destination column. If the backend state machine rejects the transition with HTTP 422, the query cache cleanly rolls back to the previous snapshot and displays a non-intrusive alert banner.
  - **Accessible Quick-Transition Actions**: In addition to drag-and-drop, cards present permitted next-step buttons (e.g. "Move to In Progress →") queried from the workflow transition matrix.
- **Verification**: 2 Vitest component tests in `KanbanBoardPage.test.tsx` verifying column rendering, card information, and quick transition click handlers. 16 web tests and 72 backend tests passing (88 total monorepo tests). Vite production build succeeded in 17.45s. Monorepo typechecks pass cleanly.

---

## Milestone 6.4: Comprehensive Issue Detail View with Comments & Attachments
- **Status**: Completed
- **Summary**: Delivered end-to-end Issue Detail page at `/issues/:id` combining state machine transition controls, hierarchical child subtasks, rich discussion comments, and multipart attachment management.
- **Key Implementation Decisions**:
  - **Two-Column Ergonomic Layout**: `IssueDetailPage.tsx` displays main story content (title, description, child subtask tree, discussion thread) in the primary left pane and operational metadata (permitted workflow status transitions, priority, assignee, reporter, file attachments widget) in the right pane.
  - **Direct Status Machine Operations**: Displays permitted workflow transitions computed from backend rules, allowing instant status updates with immediate feedback and rollback protection.
  - **Discussion Thread with File Attachments**: Supports creating, editing, and deleting comments with author identity avatars, formatted timestamps, and inline file attachment download links.
  - **Subtask Hierarchy Navigation**: Displays child subtasks with direct links to their detail views, along with "+ Add Subtask" modal workflow pre-populating parent and project relationships.
- **Verification**: 2 Vitest component tests in `IssueDetailPage.test.tsx` verifying rendering of issue details, priority, comments, and comment submission. 18 web tests and 72 backend tests passing (90 total monorepo tests). Vite production build succeeded in 15.25s. Monorepo typechecks pass cleanly.

---

## Milestone 7.1: Work Time Logging & Aggregation API + UI
- **Status**: Completed
- **Summary**: Delivered end-to-end Work Time Logging, duration summation, activity audit trail generation, and modal logging workflow for issues.
- **Key Implementation Decisions**:
  - **Dedicated Time Log Domain Module**: Created `modules/time-logs/` with `TimeLogService`, `TimeLogController`, and `timeLogRouter` providing `GET /api/v1/issues/:issueId/time-logs`, `POST /api/v1/issues/:issueId/time-logs`, and `DELETE /api/v1/time-logs/:id`.
  - **Prisma Schema & Transaction Audits**: Persists work logs against `time_logs` table linked to `issues` and `users`. Atomically creates `Activity` records on work log creation (`TIME_LOGGED`) and deletion (`TIME_LOG_DELETED`).
  - **Calculated Total Duration Aggregation**: Calculates sum of all spent minutes on the backend, returning formatted time log records and aggregate duration for easy frontend rendering.
  - **Interactive Modal & Calculation UI**: Built `LogTimeModal.tsx` supporting hours/minutes inputs with live minute calculations, work date picker, and optional work description.
  - **Sidebar Time Tracking Widget**: Built `TimeLogSection.tsx` in `IssueDetailPage.tsx` displaying total time badges (e.g. `2h 45m`), item counts, individual work entries, and deletion controls with author/admin permission checks.
- **Verification**: 11 Vitest integration tests in `time-log.test.ts` verifying authentication (401), non-member forbidden access (403), not-found checks (404), validation rules, transactional activity logging, and author/admin delete guards. 5 Vitest component tests in `LogTimeModal.test.tsx` and updated `IssueDetailPage.test.tsx`. 83 backend tests and 23 frontend tests passing (106 monorepo tests total). Monorepo typechecks and Vite build succeed cleanly.

---

## Milestone 7.2: Issue Change History & Activity Audit Timeline
- **Status**: Completed
- **Summary**: Delivered automated issue change audit trail tracking and chronological visual activity timeline UI.
- **Key Implementation Decisions**:
  - **Modular Activity API**: Built `modules/activities/` with `ActivityService` and `ActivityController`, providing `GET /api/v1/issues/:id/activities` and `GET /api/v1/projects/:id/activities` with project membership verification.
  - **Comprehensive Domain Event Auditing**: Captured transactional activity logs across the entire issue lifecycle: issue creation (`CREATED`), workflow transitions (`STATUS_CHANGED`), priority updates (`PRIORITY_CHANGED`), assignments (`ASSIGNED`), time logs (`TIME_LOGGED`, `TIME_LOG_DELETED`), comments (`COMMENT_ADDED`), and file attachments (`ATTACHMENT_ADDED`).
  - **Ergonomic Activity Timeline UI**: Built `ActivityTimeline.tsx` with vertical connecting connector stem, actor avatars, relative timestamps, and diff descriptions showing before-and-after values.
  - **Dual-Mode Discussion & History Tabs**: Updated `IssueDetailPage.tsx` with seamless tab switching between `Comments (N)` and `Activity History (N)`, invalidating activity queries automatically on user actions.
- **Verification**: 8 Vitest integration tests in `activity.test.ts` covering authentication (401), not-found (404), forbidden access (403), and activity feed queries. 4 frontend component tests in `ActivityTimeline.test.tsx` and updated `IssueDetailPage.test.tsx`. 91 backend tests and 27 frontend tests passing (118 monorepo tests total). Monorepo typechecks pass cleanly.
