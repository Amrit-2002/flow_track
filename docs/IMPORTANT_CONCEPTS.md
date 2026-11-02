# FlowTrack — Technical Interview Talking Points & Engineering Concepts

This document provides in-depth explanations of the core architectural decisions, system tradeoffs, security controls, and scalability considerations in FlowTrack. Use these structured talking points during technical software engineering interviews.

---

## 1. Top Interview Questions & Model Answers

### Q1: "Why migrate from Laravel 11 to React, Node.js, and PostgreSQL?"
> **Model Answer**:
> *"The original Laravel application was server-rendered using Blade and Alpine.js with MySQL. While great for rapid prototyping, it suffered from three core limitations as user collaboration grew:*
> 1. *Every board interaction, filter change, or time log submission required a full-page reload or fragmented Alpine DOM updates.*
> 2. *Real-time collaborative features required third-party paid subscriptions like Pusher.*
> 3. *Hosting a PHP-FPM and relational stack on free tiers is increasingly constrained compared to modern serverless edge architecture.*
>
> *By migrating to a React 18 SPA on Vercel Edge, an Express/Node.js API on Render, and PostgreSQL on Neon with Prisma ORM, we achieved sub-100ms UI interactions via optimistic client cache updates (TanStack Query), unified our codebase in full-stack TypeScript, enabled free self-hosted WebSockets via Socket.IO, and reduced hosting overhead to 100% free cloud tiers."*

---

### Q2: "Why choose a Modular Monolith rather than Microservices?"
> **Model Answer**:
> *"Microservices solve organizational scaling problems when hundreds of developers work on separate services with distinct release cycles. For a project management platform at this scale, microservices would introduce substantial accidental complexity:*
> - *Distributed transactions across issues and projects require two-phase commits or Saga patterns.*
> - *Network latency between internal services increases request overhead.*
> - *Each service requires separate container infrastructure, easily blowing past free hosting limits.*
>
> *Instead, we implemented a **Modular Monolith**. Each domain (`projects`, `issues`, `workflows`, `comments`, `notifications`) has strict boundaries with thin controllers, fat services, and isolated types. If an intensive service (such as background report generation or audit ingestion) ever needs independent scaling, it can be extracted into a separate container with minimal friction because boundaries are already enforced."*

---

### Q3: "How do you handle authentication securely across decoupled domains without XSS or CSRF vulnerabilities?"
> **Model Answer**:
> *"We implemented a dual-token authentication model with refresh token rotation:*
> 1. *When a user logs in, the backend issues a short-lived (15-minute) JWT Access Token and a long-lived (7-day) Refresh Token.*
> 2. *The Access Token is kept strictly in React in-memory state. It is never stored in `localStorage` or `sessionStorage`, making it invulnerable to malicious third-party scripts or XSS token harvesting.*
> 3. *The Refresh Token is stored in an `httpOnly`, `Secure`, `SameSite=None` (or `Lax`) cookie that JavaScript cannot access.*
> 4. *Every time an access token expires, the client calls `/api/v1/auth/refresh`. The server revokes the old refresh token and issues a brand-new token pair (rotation).*
> 5. *If a stolen or already-revoked refresh token is ever presented (replay attack), the backend detects the breach, immediately revokes all sessions belonging to that user family, and forces re-authentication."*

---

### Q4: "How does the Kanban board achieve optimistic updates with rollback on failure?"
> **Model Answer**:
> *"We use TanStack Query's optimistic mutation lifecycle:*
> 1. *`onMutate`: When a user drags a card, we immediately cancel any outgoing refetches for `['kanban-issues', projectId]` to avoid race conditions.*
> 2. *We snapshot the current issues cache for rollbacks.*
> 3. *We immediately rewrite the query cache locally so the card visually moves to the destination column with zero perceivable delay.*
> 4. *The background PATCH request is dispatched to `/api/v1/issues/:id/status`.*
> 5. *If the server accepts the transition (200 OK), the cache is settled and background real-time sync keeps others updated.*
> 6. *If the server rejects the transition with HTTP 422 (e.g. invalid workflow jump, such as `To Do` straight to `Done`), the `onError` hook catches the failure, restores the previous snapshot to snap the card back, and displays a descriptive toast error explaining the workflow violation."*

---

### Q5: "How do you secure WebSockets and prevent cross-tenant room eavesdropping?"
> **Model Answer**:
> *"WebSocket security is implemented across two distinct validation layers:*
> 1. *`io.use()` Handshake Middleware: Every incoming connection must present a valid JWT access token in `socket.handshake.auth.token` or the `Authorization` header. Unauthenticated socket attempts are rejected during the TCP handshake before allocating resources.*
> 2. *Guarded Room Subscriptions: When a connected socket sends a `join:project` event, the server does not blindly join the room. It inspects `socket.data.user` and verifies membership in the `project_members` database table (or validates global Admin/Manager bypass). Non-members are rejected, preventing unauthorized room eavesdropping across tenant boundaries.*
> 3. *Targeted In-App Alerts: Users automatically join `user:${userId}` on connection. Real-time notifications (such as assignment alerts or comment mentions) are broadcast strictly to that specific user's private room."*

---

### Q6: "How does the Workflow Transition engine preserve business integrity?"
> **Model Answer**:
> *"Rather than allowing arbitrary status column updates, FlowTrack models workflows as a directed graph stored in `workflow_transitions`:*
> - *Allowed transitions:*
>   - `To Do` $\rightarrow$ `In Progress`
>   - `In Progress` $\rightarrow$ `Done` or `In Progress` $\rightarrow$ `To Do`
>   - `Done` $\rightarrow$ `In Progress` (Re-open)
> - *When an issue transition is requested, `WorkflowService.validateTransition` queries the transition table within a database transaction.*
> - *If no edge exists between `fromStatusId` and `toStatusId`, the operation is aborted with a 422 Unprocessable Entity error.*
> - *On success, the status update is recorded alongside an immutable audit trail entry in the `activities` table."*

---

### Q7: "How did you manage free-tier hosting limitations (such as Render 15-minute sleep)?"
> **Model Answer**:
> *"We designed the system with resilience to cloud cold-starts:*
> 1. *Frontend decoupling: Vercel Edge CDN serves the React SPA statically in under 20ms regardless of whether the API backend is awake.*
> 2. *Keep-warm automation: We documented using a free external pinger (e.g. Cron-job.org or UptimeRobot) pinging `/health` every 10 minutes to prevent the instance from entering sleep during active hours.*
> 3. *Resilient Socket.IO reconnect: The frontend client uses exponential backoff reconnection (`reconnectionAttempts: 10`, `reconnectionDelay: 2000`) so that when an instance wakes up from a cold start, all real-time project rooms and notification listeners re-establish automatically without requiring user page reloads."*
