# FlowTrack — Free-Tier Deployment & Infrastructure Guide

This guide details the complete deployment architecture, environment configurations, and deployment procedures for running FlowTrack on 100% free hosting tiers without requiring paid infrastructure.

---

## 1. Free-Tier Infrastructure Architecture

```mermaid
graph LR
    User["End User Browser"]
    Vercel["Vercel Hobby Tier<br/>(React SPA Static Host)"]
    Render["Render Free Web Service<br/>(Express API + WebSockets)"]
    Neon["Neon / Supabase Free Tier<br/>(PostgreSQL Database)"]
    SupaStore["Supabase Storage Free Tier<br/>(1GB S3-Compatible File Bucket)"]

    User -->|"HTTPS (Static Assets)"| Vercel
    User -->|"REST API Requests (HTTPS with Credentials)"| Render
    User <-->|"Socket.IO Events (WSS with Auth)"| Render
    Render -->|"Connection Pooling / Prisma"| Neon
    Render -->|"Upload / Download Streams"| SupaStore
```

---

## 2. Platform Breakdown & Free Tier Limits

| Component | Provider | Tier & Constraints | Mitigation Strategy |
|---|---|---|---|
| **Frontend** | Vercel | Hobby Tier: Unlimited bandwidth, global CDN, SPA rewrites. | Built as pure Vite static output (`dist/`). |
| **Backend** | Render | Free Web Service: 512 MB RAM, spins down after 15 min of inactivity. Cold starts take ~30-50s. Ephemeral disk. | Health check endpoint `/health`, in-memory caches avoid heavy startup, external storage used for all file uploads. |
| **Database** | Neon or Supabase | Free PostgreSQL: 500 MB storage, connection pooling. | Prisma configured with `DATABASE_URL` (pooled) and `DIRECT_URL` (direct migrations). Indexes applied to prevent full-table scans. |
| **File Storage** | Supabase Storage | 1 GB Free S3-compatible bucket, 50MB per-file upload limit. | Files uploaded via backend stream with size validation (max 10MB per file). |

---

## 3. Environment Variable Matrix

### Backend (`apps/api/.env`)
```ini
NODE_ENV=production
PORT=10000
DATABASE_URL="postgresql://user:pass@ep-pooler.neon.tech/flowtrack?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://user:pass@ep.neon.tech/flowtrack?sslmode=require"
JWT_SECRET="replace-with-a-secure-random-64-character-string"
JWT_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN="7d"
CORS_ORIGIN="https://flowtrack.vercel.app"
CLIENT_URL="https://flowtrack.vercel.app"

# Supabase Storage / S3 Configuration
STORAGE_PROVIDER="supabase"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
SUPABASE_BUCKET="flowtrack-attachments"
```

### Frontend (`apps/web/.env`)
```ini
VITE_API_BASE_URL="https://flowtrack-api.onrender.com/api/v1"
VITE_SOCKET_URL="https://flowtrack-api.onrender.com"
```

---

## 4. Step-by-Step Deployment Instructions

### Step 1: Set Up Managed PostgreSQL Database (Neon or Supabase)
1. Sign up for [Neon.tech](https://neon.tech) or [Supabase](https://supabase.com).
2. Create a new project called `flowtrack`.
3. Copy the **Connection Pooling** connection string as `DATABASE_URL`.
4. Copy the **Direct** connection string as `DIRECT_URL`.

### Step 2: Run Prisma Migrations & Seed
Run migrations against the remote database from your local machine:
```bash
DATABASE_URL="<remote-pooled-url>" DIRECT_URL="<remote-direct-url>" npx prisma migrate deploy
DATABASE_URL="<remote-pooled-url>" npx prisma db seed
```

### Step 3: Configure Object Storage Bucket (Supabase Storage)
1. In Supabase Dashboard, navigate to **Storage** -> **Create new bucket**.
2. Name the bucket `flowtrack-attachments`.
3. Set public access or configure bucket policies for download URLs.

### Step 4: Deploy Express Backend to Render
1. Sign up on [Render.com](https://render.com).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Set:
   - **Root Directory**: `apps/api` (or monorepo root with build command)
   - **Build Command**: `npm install && npm run build --workspace=@flowtrack/shared && npm run build --workspace=@flowtrack/api`
   - **Start Command**: `npm run start --workspace=@flowtrack/api`
5. Under **Environment Variables**, add all backend variables listed above.
6. Verify deployment by visiting `https://<your-render-subdomain>.onrender.com/health`.

### Step 5: Deploy React Frontend to Vercel
1. Sign up on [Vercel.com](https://vercel.com).
2. Click **Add New** -> **Project** and select your GitHub repository.
3. Configure:
   - **Root Directory**: `apps/web`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Under **Environment Variables**, set:
   - `VITE_API_BASE_URL`: `https://<your-render-subdomain>.onrender.com/api/v1`
   - `VITE_SOCKET_URL`: `https://<your-render-subdomain>.onrender.com`
5. Deploy and verify SPA routing (`/dashboard`, `/projects`, `/issues`).
