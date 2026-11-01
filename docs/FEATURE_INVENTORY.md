# FlowTrack — Existing Feature Inventory & Inspection Report

This document contains a comprehensive analysis of the original Laravel codebase (`https://github.com/Amrit-2002/FlowTrack`), detailing every feature, model, controller, service, route, policy, database constraint, and business rule extracted directly from the PHP source code.

---

## 1. Authentication & User Account Management

- **Implementation in Laravel**:
  - Leverages **Laravel Breeze** scaffold with custom enhancements.
  - Controllers:
    - `App\Http\Controllers\Auth\RegisteredUserController`: Registers users with name, email, and password. Standard email format validation with unique constraint on non-deleted records (`Rule::unique('users')->whereNull('deleted_at')`).
    - `App\Http\Controllers\Auth\AuthenticatedSessionController`: Standard session-based login and logout.
    - `App\Http\Controllers\Auth\PasswordResetLinkController` & `NewPasswordController`: Password reset token generation and submission.
    - `App\Http\Controllers\ProfileController`: Profile information update, password verification on account deletion, cascade deletion of related tasks and clients, and theme switching (`updateTheme` endpoint `/profile/theme`).
  - Model: `App\Models\User`
    - Uses `SoftDeletes`, `Notifiable`, `HasFactory`.
    - Role attribute added via migration `2026_05_06_182406_add_role_to_users_table.php` (`enum('admin', 'manager', 'user')`, default `'user'`).
    - Helper methods: `isAdmin()`, `isManager()`, `isAdminOrManager()`.
    - Theme preference added via migration `2026_05_03_193639_add_theme_preference_to_users_table.php` (`default 'light'`).
- **Business Rules**:
  - Email must be unique among active users (`whereNull('deleted_at')`).
  - Passwords require min 8 chars with mixed case, letters, numbers, and symbols.
  - When an account is deleted, all owned `Task` records and `Client` records are explicitly deleted before soft-deleting the user.
- **Dependencies**: Session cookies, CSRF protection, Laravel Hash facade (bcrypt).

---

## 2. Project Management & Team Collaboration

- **Implementation in Laravel**:
  - Model: `App\Models\Project`
    - Fields: `name` (string), `key` (string max 10, unique), `description` (text, nullable).
    - Relationship: Belongs to many users via `project_users` pivot table (`project_id`, `user_id`, `role: enum('admin', 'member')`).
    - Methods: `isMember(User $user)`, `isAdmin(User $user)`.
  - Controller: `App\Http\Controllers\ProjectController`
  - Policy: `App\Policies\ProjectPolicy`
  - Routes:
    - `GET /projects` (`projects.index`) — Paginated list of projects current user belongs to, with count of issues.
    - `GET /projects/create` & `POST /projects` (`projects.store`) — Project creation.
    - `GET /projects/{project}` (`projects.show`) — Project details with issues and members.
    - `POST /projects/{project}/members` (`projects.members.add`) — Add/update member role (`admin` or `member`).
    - `DELETE /projects/{project}/members/{user}` (`projects.members.remove`) — Remove member from project.
- **Business Rules**:
  - Only global **Admin** or **Manager** can create a project (`$user->isAdminOrManager()`).
  - The creator of a project is automatically attached to `project_users` with `role = 'admin'`.
  - Project `key` must be unique and uppercase/short code (max 10 chars, e.g., `ECOM`, `CRM`).
  - Only a project **admin** (via `project_users.role = 'admin'`) can add or remove members or delete the project (`$project->isAdmin($user)`).
  - Only project members (`$project->isMember($user)`) can view project details.

---

## 3. Issue Management & Hierarchy

- **Implementation in Laravel**:
  - Model: `App\Models\Issue`
    - Fields: `project_id`, `parent_id` (nullable, for subtasks/child issues), `title`, `description`, `type` (`enum('bug', 'task', 'feature')`, default `'task'`), `priority` (`enum('low', 'medium', 'high')`, default `'medium'`), `status_id`, `assignee_id` (nullable), `reporter_id`.
    - Auto-Activity Hook (`booted` method): Whenever `status_id`, `assignee_id`, or `priority` is updated, an `Activity` record is automatically inserted with old and new human-readable values.
  - Controller: `App\Http\Controllers\IssueController`
  - Service: `App\Services\IssueService`
  - Policy: `App\Policies\IssuePolicy`
  - Routes:
    - `GET /issues` — Filtered & paginated issue list (filters: search term, status, assignee, priority, project). Scoped to user's joined projects.
    - `GET /issues/create` & `POST /issues` — Issue creation with file attachments.
    - `GET /issues/{issue}` — Issue detail view with activities, comments, attachments, subtasks, and time logs.
    - `PUT /issues/{issue}` — Issue update.
    - `DELETE /issues/{issue}` — Issue deletion.
    - `PATCH /issues/{issue}/status` — AJAX status transition.
    - `PATCH /issues/{issue}/ajax-update` — Inline field update (priority, assignee, etc.).
    - `GET /issues-api/potential-parents` — Returns top-level issues (`parent_id IS NULL`) for nesting.
- **Business Rules**:
  - To create an issue: The user must be a global Admin/Manager AND have project-level `admin` role in the selected project.
  - To update an issue: The user must be a project member AND (must be the `assignee_id` OR `reporter_id`).
  - To delete an issue: The user must be a project member AND the `reporter_id`.
  - When assigned: Triggers an `IssueAssigned` notification if assignee is not the reporter.
  - Subtask rule: Only 1 level of hierarchy is permitted (`parent_id IS NULL` for parents).

---

## 4. Workflow & Status Transition Engine

- **Implementation in Laravel**:
  - Models:
    - `App\Models\Status`: `name` (e.g., 'To Do', 'In Progress', 'Done'), `order` (integer).
    - `App\Models\Transition`: `from_status_id`, `to_status_id`.
  - Service: `App\Services\WorkflowService`
    - `canTransition(fromStatusId, toStatusId)`:
      - Returns `true` if `fromStatusId == toStatusId` (metadata update without status change).
      - Otherwise checks if an active record exists in `transitions` matching `from_status_id` and `to_status_id`.
  - Seeded Transitions:
    - `To Do` -> `In Progress`
    - `In Progress` -> `Done`
    - `In Progress` -> `To Do`
    - `Done` -> `In Progress`
    - *Direct jump from `To Do` -> `Done` is forbidden!*
- **Business Rules**:
  - Any issue update or drag-and-drop status update must be verified against `WorkflowService`.
  - If a status change violates the transition rule, the backend throws an exception or responds with HTTP 422, and the UI rolls back the card to its previous column.

---

## 5. Kanban Board

- **Implementation in Laravel**:
  - Controller: `IssueController@board`
  - Blade: `resources/views/issues/board.blade.php` with `Sortable.js`
  - Fetches statuses ordered by `order` with issues scoped to the authenticated user's projects.
  - Drag-and-drop triggers a `PATCH /issues/{id}/status` request.
  - Cards where the user lacks update authorization are marked with `.no-drag` and disabled.

---

## 6. Comments & File Attachments

- **Implementation in Laravel**:
  - Models:
    - `App\Models\Comment`: `issue_id`, `user_id`, `content`.
    - `App\Models\Attachment`: `issue_id` (nullable), `comment_id` (nullable), `file_path`, `file_name`, `user_id`.
  - Controller: `App\Http\Controllers\CommentController`
  - Route: `POST /issues/{issue}/comments`
  - Notifications: When a comment is created, all issue participants (assignee and reporter, excluding comment author) receive `CommentAdded` notification.
- **Business Rules**:
  - File upload limits: max 10,240 KB (10MB) per attachment.
  - Attachments can belong directly to an issue or to an individual comment.

---

## 7. Time Tracking

- **Implementation in Laravel**:
  - Model: `App\Models\TimeLog`: `issue_id`, `user_id`, `time_spent` (in minutes), `description` (nullable), `log_date` (date).
  - Controller: `App\Http\Controllers\TimeLogController`
  - Route: `POST /issues/{issue}/time-logs`
  - Aggregations: Summed up per issue and displayed in hours and minutes (`floor(minutes / 60)`h `minutes % 60`m).

---

## 8. Activity Timeline

- **Implementation in Laravel**:
  - Model: `App\Models\Activity`: `issue_id`, `user_id`, `action`, `old_value`, `new_value`.
  - Tracked actions: status transitions, assignee changes, priority changes.
  - Displayed on issue detail view sorted chronologically (latest first or timeline sequence).

---

## 9. Dashboard & Analytics

- **Implementation in Laravel**:
  - Controller: `App\Http\Controllers\DashboardController`
  - Computes metrics across all projects the user is a member of:
    - Total issues count.
    - Issues breakdown grouped by Status.
    - Issues breakdown grouped by Type (`bug`, `task`, `feature`).
    - Top 10 users ranked by assigned issue count.
    - Total logged time (sum in minutes).
    - Average time per issue.
    - Bottleneck status (status with the highest number of issues).
    - Most active user based on time log entries count.

---

## 10. Saved Filters

- **Implementation in Laravel**:
  - Model: `App\Models\SavedFilter`: `user_id`, `name`, `filter_data` (JSON).
  - Controller: `App\Http\Controllers\SavedFilterController`
  - Policy: `App\Policies\SavedFilterPolicy` (only filter owner can delete).
  - Enables users to save specific search and filter configurations and re-apply them in one click.

---

## 11. Legacy Task & Client Management (Tabular Tracker)

- **Implementation in Laravel**:
  - Models: `App\Models\Task`, `App\Models\Client`
  - Controllers: `App\Http\Controllers\TaskController`, `App\Http\Controllers\ClientController`
  - Features:
    - Tabular view of development status per stage (`dev_status`, `unit_test_status`, `staging_status`, `prod_status`).
    - Client directory with unique names per active user.
    - Autosuggest endpoint for task/bug names.
    - JSON export endpoint.
- **Business Rules**:
  - Only task owner can edit or delete their task.
  - End date must be on or after start date.
