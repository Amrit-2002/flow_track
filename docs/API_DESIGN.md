# FlowTrack — REST API & WebSocket Design Specification

This document defines the REST API standards, response envelopes, error handling, authentication schemas, and endpoint specifications for FlowTrack.

---

## 1. Global API Standards

- **Base URL**: `/api/v1`
- **Content-Type**: `application/json` (or `multipart/form-data` for file uploads)
- **Authentication**: `Authorization: Bearer <accessToken>` header for protected endpoints.
- **Refresh Token**: HTTP-Only, Secure, SameSite cookie named `refreshToken`.

### Standard Success Envelope
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional descriptive success message",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  }
}
```

### Standard Error Envelope
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested issue does not exist or you do not have permission to view it.",
    "details": []
  }
}
```

---

## 2. Authentication & User Management Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Public | Register new user. Sets refresh cookie, returns access token + user. |
| `POST` | `/api/v1/auth/login` | Public | Login with email/password. Sets refresh cookie, returns access token + user. |
| `POST` | `/api/v1/auth/refresh` | Cookie | Rotates refresh token in cookie and returns fresh access token. |
| `POST` | `/api/v1/auth/logout` | Authenticated | Revokes refresh token in database and clears cookie. |
| `GET` | `/api/v1/users/me` | Authenticated | Retrieves currently authenticated user profile. |
| `PATCH` | `/api/v1/users/me` | Authenticated | Updates name, email, or password. |
| `PATCH` | `/api/v1/users/me/theme` | Authenticated | Updates UI theme preference (`light` / `dark`). |
| `DELETE` | `/api/v1/users/me` | Authenticated | Soft-deletes user account after confirming password. |
| `GET` | `/api/v1/users` | Authenticated | Lists users for assignee selection dropdowns. |

---

## 3. Project Management Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/projects` | Authenticated | Lists projects user is a member of (with member & issue counts). |
| `POST` | `/api/v1/projects` | Admin/Manager | Creates a new project and attaches creator as project ADMIN. |
| `GET` | `/api/v1/projects/:id` | Project Member | Returns project details, member list, and issues. |
| `PATCH` | `/api/v1/projects/:id` | Project Admin | Updates project name or description. |
| `DELETE` | `/api/v1/projects/:id` | Project Admin | Deletes/archives project. |
| `POST` | `/api/v1/projects/:id/members` | Project Admin | Adds or updates a project member's role (`ADMIN`, `MEMBER`). |
| `DELETE` | `/api/v1/projects/:id/members/:userId` | Project Admin | Removes a user from project membership. |

---

## 4. Issue Management & Hierarchy Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/issues` | Authenticated | Paginated issue list with search, filter (status, assignee, priority, project). |
| `POST` | `/api/v1/issues` | Project Admin | Creates issue (supports multipart for file attachments). Emits socket event. |
| `GET` | `/api/v1/issues/:id` | Project Member | Deep issue details (comments, attachments, subtasks, activities, time logs). |
| `PUT` | `/api/v1/issues/:id` | Assignee/Reporter | Updates issue fields. Enforces workflow transition rules. |
| `PATCH` | `/api/v1/issues/:id/status` | Assignee/Reporter | Quick status update. Validates transition path via WorkflowService. |
| `PATCH` | `/api/v1/issues/:id/field` | Assignee/Reporter | Inline single field update (priority, assignee). |
| `DELETE` | `/api/v1/issues/:id` | Reporter | Deletes issue. |
| `GET` | `/api/v1/issues/potential-parents` | Authenticated | Returns top-level issues (`parentId IS NULL`) for subtask parent selection. |

---

## 5. Kanban Board & Workflow Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/issues/board` | Authenticated | Returns columns (statuses in order) with active project issues. |
| `GET` | `/api/v1/workflows/statuses` | Authenticated | Returns all defined statuses. |
| `GET` | `/api/v1/workflows/transitions`| Authenticated | Returns all allowed status transitions matrix. |

---

## 6. Collaboration, Attachments & Time Tracking

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/issues/:id/comments` | Project Member | Post comment with optional file attachments. Notifies assignee/reporter. |
| `DELETE` | `/api/v1/comments/:id` | Comment Author | Deletes comment and associated attachments. |
| `POST` | `/api/v1/issues/:id/attachments` | Project Member | Uploads attachment directly to issue. |
| `DELETE` | `/api/v1/attachments/:id` | Attachment Owner | Deletes attachment from database and cloud object storage. |
| `POST` | `/api/v1/issues/:id/time-logs` | Project Member | Logs time spent in minutes on an issue. |
| `DELETE` | `/api/v1/time-logs/:id` | Log Owner | Deletes time log. |

---

## 7. Notifications, Saved Filters, & Dashboard

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/dashboard/stats` | Authenticated | Returns issue counts, status distribution, time metrics, bottleneck status. |
| `GET` | `/api/v1/notifications` | Authenticated | Lists recent notifications for current user with unread count. |
| `PATCH` | `/api/v1/notifications/:id/read` | Authenticated | Marks specific notification as read. |
| `PATCH` | `/api/v1/notifications/read-all` | Authenticated | Marks all notifications as read for current user. |
| `GET` | `/api/v1/saved-filters` | Authenticated | Lists saved search filters for current user. |
| `POST` | `/api/v1/saved-filters` | Authenticated | Saves a custom filter configuration. |
| `DELETE` | `/api/v1/saved-filters/:id` | Filter Owner | Deletes a saved filter. |

---

## 8. WebSocket Event Specifications (Socket.IO)

- **Connection**: `ws://<backend_host>/socket.io`
- **Auth Handshake**: `auth: { token: "<accessToken>" }`
- **Rooms**:
  - `user:<userId>`: Private notifications room.
  - `project:<projectId>`: Project collaboration room for issue updates and comments.
- **Events Emitted**:
  - `issue:created`: `{ projectId, issue }`
  - `issue:updated`: `{ projectId, issue, changes }`
  - `issue:status_changed`: `{ projectId, issueId, oldStatusId, newStatusId }`
  - `comment:added`: `{ projectId, issueId, comment }`
  - `notification:received`: `{ notification }`
