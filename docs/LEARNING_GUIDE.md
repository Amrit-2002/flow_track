# FlowTrack — Technical Learning Guide & Engineering Concepts

This guide is designed to explain the key software engineering concepts, design decisions, architectural patterns, and full-stack mechanics employed throughout the FlowTrack application.

---

## 1. Core Architectural Concepts

### Monolithic vs. Microservices vs. Modular Monolith
In FlowTrack, we opted for a **Modular Monolith** rather than microservices:
- **Why?** Microservices introduce massive operational overhead: distributed transactions, network latency between services, complex message queues, separate deployment pipelines, and high infrastructure costs that break free-tier hosting limits.
- **How Modular Monolith Solves This**: All backend modules live in a single Express codebase and run in one process, but have strict domain boundaries (`modules/projects`, `modules/issues`, `modules/auth`). If a specific module ever needs to scale independently in the future, its clear interfaces make extraction trivial.

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
