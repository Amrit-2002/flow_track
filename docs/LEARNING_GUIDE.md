# FlowTrack — Technical Learning Guide & Engineering Concepts

This guide is designed to explain the key software engineering concepts, design decisions, architectural patterns, and full-stack mechanics employed throughout the FlowTrack application.

---

## 1. Core Architectural Concepts

### Monolithic vs. Microservices vs. Modular Monolith
In FlowTrack, we opted for a **Modular Monolith** rather than microservices:
- **Why?** Microservices introduce massive operational overhead: distributed transactions, network latency between services, complex message queues, separate deployment pipelines, and high infrastructure costs that break free-tier hosting limits.
- **How Modular Monolith Solves This**: All backend modules live in a single Express codebase and run in one process, but have strict domain boundaries (`modules/projects`, `modules/issues`, `modules/auth`, `modules/notifications`). If a specific module ever needs to scale independently in the future, its clear interfaces make extraction trivial.

### Thin Controllers vs. Fat Services
- **Controllers**: Only responsible for HTTP concerns: unpacking request params, parsing bodies, setting status codes, invoking services, and sending responses. No SQL queries or complex if/else logic belong in controllers.
- **Services**: Pure business logic. Services validate domain constraints, orchestrate multiple database operations within transactions, and trigger side effects (notifications, emails, WebSocket events).
- **Repositories**: Encapsulate database queries via Prisma ORM, preventing leaky abstractions and making unit testing easier.

---

## 2. Authentication & Security Concepts

### Dual-Token JWT with Refresh Token Rotation
Traditional session cookies require server-side state or shared Redis instances, which add complexity and cold-start latency. FlowTrack uses a stateless Access Token + durable Refresh Token model:
1. **Access Token (JWT)**:
   - Short-lived (15 minutes).
   - Signed with `JWT_SECRET` (HMAC SHA-256).
   - Stored in memory on the frontend (never in `localStorage` to avoid XSS token theft).
   - Contains minimal claims: `userId`, `email`, `role`.
2. **Refresh Token**:
   - Long-lived (7 days).
   - Stored in an **HTTP-only, Secure, SameSite** cookie (inaccessible to malicious JavaScript).
   - Hashed using SHA-256 and stored in the PostgreSQL `RefreshToken` table.
   - **Rotation & Reuse Detection**: Every time a refresh token is exchanged, it is revoked and replaced with a new token. If an already revoked token is submitted, the backend immediately invalidates all active sessions for that user, detecting and neutralizing replay attacks.

### Two-Tier Authorization (Global RBAC + Project-Level Roles)
FlowTrack distinguishes between global platform permissions and project-scoped roles:
- **Global Roles**:
  - `ADMIN`: Platform administrator, can manage all resources and projects.
  - `MANAGER`: Can create projects and assign team leads.
  - `USER`: Standard team contributor.
- **Project Membership Roles**:
  - `ADMIN`: Project creator/manager. Can add/remove members, configure project settings, and create issues.
  - `MEMBER`: Project collaborator. Can view issues, update issues assigned to them or reported by them, log time, and comment.

---

## 3. Database & Query Optimization

### N+1 Query Prevention in Prisma
The N+1 problem occurs when an application executes 1 query for a list of $N$ items, and then executes $N$ additional queries to fetch related entities.
- **Prisma's Solution**: FlowTrack utilizes Prisma's `include` and `select` directives with batched relations (`withCount`, eager joins), querying the parent items and all related child entities in a minimal number of optimized SQL statements.

### Workflow Transition Integrity
Status changes are not arbitrary string updates. FlowTrack models workflow transitions as a directed graph stored in `workflow_transitions`:
- Before any issue status update is committed, the `WorkflowService` verifies that an edge $(S_{\text{from}}, S_{\text{to}})$ exists in the transitions table.
- Direct illegal leaps (e.g., jumping from `To Do` directly to `Done` when no direct transition exists) are rejected with HTTP 422 Unprocessable Entity, ensuring data integrity.

---

## 4. Deep-Dive Paradigm Shifts: Laravel vs. Modern Node/React

### A. Eloquent (Active Record) vs. Prisma (Data Mapper)
- **Laravel Eloquent**: Each model instance represents a database row and contains both database state and query/persistence methods (`$issue->save()`, `$issue->comments()`).
  - *Tradeoff*: Rapid prototyping, but mutability makes tracking object modifications tricky. Lazy loading can silently trigger N+1 queries in Blade loops.
- **Prisma ORM**: Models are plain TypeScript types with no runtime methods. Database interactions occur via a centralized, decoupled query client (`prisma.issue.update()`).
  - *Advantage*: Type-safe query builder, compile-time validation of select fields and joins, deterministic relational loading without hidden lazy queries.

### B. Server-Side Rendering (Blade) vs. Client-Side SPA (React 18)
- **Blade + Alpine**: Every interaction or page navigation triggers a full HTTP request/response cycle, re-rendering the full HTML layout on the PHP server.
  - *Tradeoff*: Server load scales directly with page views, and creating fluid interactive experiences (like animated drag-and-drop Kanban boards) requires awkward DOM manipulation with Alpine.js or jQuery.
- **React 18 + Vite**: The browser downloads a lightweight static bundle once from a global edge CDN. Only raw JSON data travels over the wire via REST and WebSockets.
  - *Advantage*: Zero server-side rendering latency, instant view transitions without white-screen flashes, stateful UI controls, and complete decoupling of frontend and backend.

### C. Laravel Sessions vs. Stateless Dual-Token JWT
- **Laravel Breeze**: Relies on PHP session cookies backed by file or Redis storage. Every request looks up session ID in Redis/file system.
  - *Tradeoff*: Requires stateful server memory or external Redis instances that are not natively persistent on free cloud tiers.
- **Node Dual-Token**:
  - The API server verifies incoming JWT access tokens using fast, in-memory cryptographic verification without hitting the database for every read request.
  - The database is only queried once every 15 minutes when refreshing tokens or invalidating sessions.

### D. Laravel Pusher/Echo vs. Self-Hosted Socket.IO
- **Laravel Echo**: Typically mandates a paid third-party SaaS subscription (Pusher) or running an external WebSocket server (Soketi/Laravel Reverb) with Redis pub/sub.
- **Native Socket.IO**: Runs inside the Node.js event loop on the same server instance. Zero cost, native WebSocket upgrades, automated heartbeat ping/pong, and isolated room subscriptions.

---

## 5. Real-Time Collaboration & Room Isolation

To prevent multi-tenant data leakage, WebSocket rooms enforce strict authorization checks:
1. When a client socket attempts to join a room via `join:project`:
   - The server inspects the socket's authenticated user ID.
   - It queries the `project_members` table (or bypasses for global Admins/Managers).
   - If unauthorized, the join request is rejected and logged.
2. In-app alerts are routed to private user rooms (`user:${userId}`), ensuring users only receive notifications intended specifically for them.

---

## 6. Testing Philosophy: The Monorepo Quality Pyramid

FlowTrack implements a 3-tier testing strategy:
1. **Unit & Component Tests** (`Vitest` + `React Testing Library`):
   - Fast, isolated verification of UI components, modals, formatters, and utility functions.
2. **API Integration Tests** (`Vitest` + `Supertest`):
   - End-to-end HTTP request testing through Express routers, middleware, Zod validation, and mock Prisma transactions without external dependencies.
3. **End-to-End Tests** (`Playwright`):
   - Multi-server browser automation running real browser engines to verify critical user paths (auth, navigation, Kanban, notifications).
