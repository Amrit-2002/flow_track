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
