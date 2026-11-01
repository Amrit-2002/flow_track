# FlowTrack — Important Engineering Concepts & Interview Talking Points

This document provides concise explanations of the core design decisions, system trade-offs, and technical solutions implemented in FlowTrack. Use these as talking points in technical interviews.

---

## 1. Why Monorepo with npm Workspaces?
- **Shared Code Without Publishing**: The `packages/shared` package houses Zod schemas and TypeScript interfaces consumed by both `apps/web` (frontend) and `apps/api` (backend). When an entity shape changes, TypeScript flags discrepancies immediately in both frontend and backend at compile time.
- **Single Source of Truth**: Atomic commits and unified CI/CD pipelines across the full stack.

---

## 2. Why TanStack Query + Redux Toolkit?
- **Server State vs. Client State**:
  - Many applications misuse Redux by loading database records into Redux slices, requiring hundreds of lines of boilerplate actions and reducers to manage caching, refetching, and pagination.
  - FlowTrack separates concerns:
    - **Redux Toolkit**: Dedicated strictly to **client-only global state** (active theme, user authentication token, sidebar expansion).
    - **TanStack Query**: Dedicated to **server state** (caching query responses, automatic background refetching, deduping parallel requests, optimistic UI updates, and cache invalidation on mutations).

---

## 3. How Optimistic UI Updates Work on the Kanban Board
- When a user drags an issue from "To Do" to "In Progress":
  1. TanStack Query `onMutate` cancels outgoing refetches for the board query.
  2. It snapshots the previous board state.
  3. It optimistically moves the card to the target column immediately, giving the user an instant, lag-free experience.
  4. The background PATCH request is sent to `/api/v1/issues/:id/status`.
  5. If the backend accepts the transition (200 OK), the cache is settled.
  6. If the backend rejects the transition with HTTP 422 (e.g. invalid workflow step), the `onError` callback restores the previous snapshot, snapping the card back to its original column, and fires a descriptive toast error.

---

## 4. How Real-Time WebSockets Are Managed Safely
- WebSocket servers can easily become single points of failure or resource hogs. FlowTrack uses Socket.IO with these guardrails:
  - **Stateless REST Source of Truth**: All mutations are executed via HTTP REST endpoints and committed to PostgreSQL first.
  - **Post-Commit Broadcast**: Once a mutation succeeds, the server emits a lightweight event to the appropriate room (`project:<id>` or `user:<id>`).
  - **Graceful Degradation**: If WebSocket connection drops due to network jitter or free-tier sleep cycles, the application remains 100% functional via standard HTTP polling/invalidation.
