# FlowTrack — Old-to-New Architecture Mapping

This document provides a systematic mapping between the original Laravel application components and the modern React + Node.js/Express + Prisma/PostgreSQL monorepo architecture.

---

## 1. Architectural Paradigms

| Aspect | Old Architecture (Laravel 11) | New Architecture (React + Express + PostgreSQL) |
|---|---|---|
| **Paradigm** | Monolithic SSR (Blade + Alpine.js) | Decoupled Modular Monolith (SPA + REST API + WebSockets) |
| **Language** | PHP 8.2+ | TypeScript across frontend and backend |
| **Database Access** | Eloquent ORM + MariaDB/MySQL | Prisma ORM + PostgreSQL |
| **Authentication** | Laravel Breeze Session Cookies & CSRF | JWT Access Tokens in memory/headers + HTTP-only Refresh Cookies with rotation |
| **Authorization** | Laravel Policies (`IssuePolicy`, `ProjectPolicy`) | Modular Express Middleware + Service Layer RBAC guards |
| **Validation** | Form Requests (`StoreIssueRequest`, etc.) | Zod Schemas shared/module-specific with TypeScript inference |
| **State Management** | Alpine.js reactive data & DOM manipulation | Redux Toolkit (auth, UI) + TanStack Query (server cache, optimistic UI) |
| **Real-time** | Polling / Page Refresh | Socket.IO authenticated channels for instant updates |
| **File Storage** | Local `storage/app/public` symlinked | Multer stream to Supabase Storage / S3-compatible bucket |
| **Testing** | Pest (Feature & Unit) | Vitest, Supertest, React Testing Library, Playwright |

---

## 2. Model & Entity Mapping

| Laravel Model | Database Table (Old) | Prisma Entity (New) | Key Architectural Improvements |
|---|---|---|---|
| `User` | `users` | `User` | CUID/UUID or BigInt IDs, enum roles (`ADMIN`, `MANAGER`, `USER`), refresh token relation, strict null safety. |
| `Project` | `projects` | `Project` | Added `isArchived` flag, relation to `ProjectMember`, indexes on `key`. |
| Pivot `project_users` | `project_users` | `ProjectMember` | First-class Prisma model with composite unique key `[projectId, userId]`, enum `ProjectRole` (`ADMIN`, `MEMBER`). |
| `Issue` | `issues` | `Issue` | Hierarchical relation `parent`/`children` (epics/subtasks), enum `IssueType`, enum `IssuePriority`, relations to activities, time logs, comments. |
| `Status` | `statuses` | `Status` | Dynamic order indexing, workflow relations. |
| `Transition` | `transitions` | `WorkflowTransition` | Composite unique key `[fromStatusId, toStatusId]`, explicit relationship mapping. |
| `Activity` | `activities` | `Activity` | Foreign keys to `issueId`, `userId`, structured action and diff values. |
| `Comment` | `comments` | `Comment` | Text content, relations to attachments and user. |
| `Attachment` | `attachments` | `Attachment` | Storing cloud storage URL/key, MIME type, byte size, polymorphic or direct relations to `issueId` and `commentId`. |
| `TimeLog` | `time_logs` | `TimeLog` | Logged date, duration in minutes, notes, relations to user and issue. |
| `SavedFilter` | `saved_filters` | `SavedFilter` | Structured JSON filter criteria for rapid issue list filtering. |
| `Client` | `clients` | `Client` | Soft delete support, relation to creator user. |
| `Task` | `tasks` | `Task` | Preserved for backward compatibility with stage statuses (`dev`, `unit_test`, `staging`, `prod`). |
| Laravel Notifications | `notifications` | `Notification` | Native Prisma table with `type`, `data` (JSON), `readAt`, `userId`. |
| Laravel Sessions | `sessions` | `RefreshToken` | Secure hashed refresh token storage with device/IP tracking and expiration. |

---

## 3. Controller & Endpoint Mapping

| Feature | Old Route & Controller | New Express Route & Controller | Method | Purpose |
|---|---|---|---|---|
| **Auth Register** | `POST /register`<br>`RegisteredUserController@store` | `POST /api/v1/auth/register`<br>`auth.controller.ts:register` | POST | Creates user, issues access token & set-cookie refresh token |
| **Auth Login** | `POST /login`<br>`AuthenticatedSessionController@store` | `POST /api/v1/auth/login`<br>`auth.controller.ts:login` | POST | Authenticates credentials, sets refresh cookie, returns access token |
| **Auth Refresh** | N/A (Session based) | `POST /api/v1/auth/refresh`<br>`auth.controller.ts:refresh` | POST | Rotates refresh token and returns new access token |
| **Auth Logout** | `POST /logout`<br>`AuthenticatedSessionController@destroy` | `POST /api/v1/auth/logout`<br>`auth.controller.ts:logout` | POST | Clears cookie and revokes refresh token in database |
| **User Profile** | `GET /profile`, `PATCH /profile`<br>`ProfileController` | `GET /api/v1/users/me`, `PATCH /api/v1/users/me`<br>`user.controller.ts` | GET, PATCH | Reads and updates user profile and theme preference |
| **Dashboard** | `GET /dashboard`<br>`DashboardController@index` | `GET /api/v1/dashboard/stats`<br>`dashboard.controller.ts` | GET | Aggregated counts, time metrics, status & type distributions |
| **Projects List** | `GET /projects`<br>`ProjectController@index` | `GET /api/v1/projects`<br>`project.controller.ts:list` | GET | Paginated project list with counts and member info |
| **Project Create** | `POST /projects`<br>`ProjectController@store` | `POST /api/v1/projects`<br>`project.controller.ts:create` | POST | Validates unique key, creates project, assigns creator as ADMIN |
| **Project Detail** | `GET /projects/{id}`<br>`ProjectController@show` | `GET /api/v1/projects/:id`<br>`project.controller.ts:getById` | GET | Loads project, issues, and member team |
| **Project Members** | `POST /projects/{id}/members`<br>`ProjectController@addMember` | `POST /api/v1/projects/:id/members`<br>`project.controller.ts:addMember` | POST | Adds or updates member role |
| **Remove Member** | `DELETE /projects/{id}/members/{userId}`<br>`ProjectController@removeMember` | `DELETE /api/v1/projects/:id/members/:userId`<br>`project.controller.ts:removeMember` | DELETE | Removes member from project |
| **Issues List** | `GET /issues`<br>`IssueController@index` | `GET /api/v1/issues`<br>`issue.controller.ts:list` | GET | Search, filter by status/priority/assignee/project, paginate |
| **Kanban Board** | `GET /issues/board`<br>`IssueController@board` | `GET /api/v1/issues/board`<br>`issue.controller.ts:getBoard` | GET | Grouped issues by ordered statuses |
| **Issue Create** | `POST /issues`<br>`IssueController@store` | `POST /api/v1/issues`<br>`issue.controller.ts:create` | POST | Multipart upload + validation, creates issue, emits Socket.IO event |
| **Issue Detail** | `GET /issues/{id}`<br>`IssueController@show` | `GET /api/v1/issues/:id`<br>`issue.controller.ts:getById` | GET | Deep issue view with comments, attachments, subtasks, activities |
| **Issue Update** | `PUT /issues/{id}`<br>`IssueController@update` | `PUT /api/v1/issues/:id`<br>`issue.controller.ts:update` | PUT | Validates workflow transition, records activity diff, emits update |
| **Issue Status** | `PATCH /issues/{id}/status`<br>`IssueController@updateStatus` | `PATCH /api/v1/issues/:id/status`<br>`issue.controller.ts:updateStatus` | PATCH | Fast transition check with 422 on invalid transition |
| **Issue Field** | `PATCH /issues/{id}/ajax-update`<br>`IssueController@ajaxUpdate` | `PATCH /api/v1/issues/:id/field`<br>`issue.controller.ts:updateField` | PATCH | Inline single-field editor |
| **Parent Candidates** | `GET /issues-api/potential-parents`<br>`IssueController@getPotentialParents` | `GET /api/v1/issues/potential-parents`<br>`issue.controller.ts:getPotentialParents`| GET | Returns candidate parent issues for subtask creation |
| **Comments** | `POST /issues/{id}/comments`<br>`CommentController@store` | `POST /api/v1/issues/:id/comments`<br>`comment.controller.ts:create` | POST | Creates comment with attachments, triggers notifications |
| **Time Logs** | `POST /issues/{id}/time-logs`<br>`TimeLogController@store` | `POST /api/v1/issues/:id/time-logs`<br>`time-log.controller.ts:create` | POST | Creates time log entry in minutes |
| **Notifications** | `GET/POST /notifications/*`<br>`NotificationController` | `GET /api/v1/notifications`, `PATCH /api/v1/notifications/read-all`<br>`notification.controller.ts` | GET, PATCH | Lists user notifications, marks read |
| **Saved Filters** | `POST/DELETE /saved-filters/*`<br>`SavedFilterController` | `GET/POST/DELETE /api/v1/saved-filters`<br>`saved-filter.controller.ts` | CRUD | Saved filter management |
| **Tasks (Legacy)** | `TaskController` | `GET/POST/PUT/DELETE /api/v1/tasks`<br>`task.controller.ts` | CRUD | Full CRUD for tabular task tracker |
| **Clients** | `ClientController` | `GET/POST/PUT/DELETE /api/v1/clients`<br>`client.controller.ts` | CRUD | Full CRUD for client directory |

---

## 3. Frontend View Mapping

| Laravel Blade View | React / Vite Component | State / Hook |
|---|---|---|
| `views/dashboard/issues.blade.php` | `pages/DashboardPage.tsx` | `useDashboardStats()`, Recharts for status/type distribution |
| `views/projects/index.blade.php` | `pages/ProjectsPage.tsx` | `useProjects()`, ProjectCard, CreateProjectDialog |
| `views/projects/show.blade.php` | `pages/ProjectDetailPage.tsx` | `useProjectDetails()`, ProjectMembersTab, ProjectIssuesTab |
| `views/issues/index.blade.php` | `pages/IssuesPage.tsx` | `useIssues()`, FilterToolbar, SavedFiltersDropdown, DataTable |
| `views/issues/board.blade.php` | `pages/KanbanBoardPage.tsx` | `useKanbanBoard()`, `@hello-pangea/dnd`, Optimistic Mutations |
| `views/issues/show.blade.php` | `pages/IssueDetailPage.tsx` | `useIssueDetail()`, InlineEditor, CommentThread, ActivityTimeline, TimeLogModal |
| `views/tasks/tabulator.blade.php` | `pages/TasksPage.tsx` | `useTasks()`, TanStack Table, AutoSuggestCombobox |
| `views/clients/index.blade.php` | `pages/ClientsPage.tsx` | `useClients()`, ClientDialog |
| `views/profile/edit.blade.php` | `pages/ProfilePage.tsx` | `useProfile()`, ThemeToggle, PasswordForm |
| `views/layouts/navigation.blade.php` | `components/layout/AppSidebar.tsx` + `TopNav.tsx` | Redux auth state, Lucide icons, NotificationDropdown |
