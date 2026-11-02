# FlowTrack — Complete Free-Tier Deployment & Hosting Guide

This guide provides end-to-end instructions for deploying the entire FlowTrack monorepo to production using **100% free hosting tiers**. No paid subscriptions or credit cards are required.

---

## 1. Zero-Cost Architecture Overview

```
 ┌─────────────────────────────────────────────────────────────┐
 │                       Vercel (Hobby)                        │
 │  React 18 + Vite SPA · Tailwind CSS · Global Edge CDN       │
 │  URL: https://flowtrack-web.vercel.app                      │
 └──────────────┬──────────────────────────────▲───────────────┘
                │                              │
       HTTPS REST API Calls           Real-Time Socket.IO
      (Bearer JWT in Header)         (WebSocket / Polling)
                │                              │
 ┌──────────────▼──────────────────────────────┴───────────────┐
 │                     Render Web Service                      │
 │  Express.js API · Node.js 20 · Socket.IO Server             │
 │  URL: https://flowtrack-api.onrender.com                    │
 └──────────────┬──────────────────────────────┬───────────────┘
                │                              │
       Prisma Query Engine           Object Storage (Uploads)
    (PgBouncer Pooled Conn)                    │
 ┌──────────────▼──────────────┐ ┌─────────────▼───────────────┐
 │   Neon / Supabase Postgres  │ │   Supabase Object Storage   │
 │   Free 500MB DB · PG 16     │ │   Free 1GB S3-Compatible    │
 └─────────────────────────────┘ └─────────────────────────────┘
```

| Component | Free-Tier Provider | Free Limit Details |
| :--- | :--- | :--- |
| **Frontend** | [Vercel](https://vercel.com) | Unlimited deployments, 100GB bandwidth/month, Global Edge Network |
| **Backend** | [Render](https://render.com) | 750 free instance hours/month, automatic SSL, WebSockets enabled |
| **Database** | [Neon](https://neon.tech) / [Supabase](https://supabase.com) | 0.5 GB Postgres 16 storage, built-in connection pooling |
| **Attachments** | Supabase Storage / Render disk | 1GB free object storage with public URLs |
| **CI/CD** | [GitHub Actions](https://github.com/features/actions) | 2,000 free runner minutes/month |

---

## 2. Step 1: Database Provisioning (Neon / Supabase)

### Option A: Neon Serverless Postgres (Recommended)
1. Sign up for free at [neon.tech](https://neon.tech).
2. Create a project named `flowtrack-prod` and select your nearest region.
3. In the Neon Console Dashboard, copy your connection string with **Connection Pooling enabled**:
   ```
   postgresql://flowtrack_user:password@ep-cool-fog-123456-pooler.us-east-2.aws.neon.tech/flowtrack?sslmode=require&pgbouncer=true
   ```
4. Also copy the direct connection string (without `-pooler`) for Prisma migrations:
   ```
   postgresql://flowtrack_user:password@ep-cool-fog-123456.us-east-2.aws.neon.tech/flowtrack?sslmode=require
   ```

### Option B: Supabase Postgres
1. Sign up at [supabase.com](https://supabase.com) and click **New Project**.
2. Set database password and select your preferred region.
3. In **Project Settings** > **Database**, locate the **Connection string** (URI mode, Transaction pooler on port 6543).

### Run Migrations & Seed Production Database
From your local terminal, apply schema migrations and populate initial seed data:
```bash
# Set your production database URL temporarily
export DATABASE_URL="your-production-database-url"

# Deploy Prisma migrations
npm run db:migrate

# Seed standard users (Admin, Manager, User), workflow statuses, and demo tickets
npm run db:seed
```

---

## 3. Step 2: Backend Deployment on Render

### Method A: Deploy using Render Blueprint (`render.yaml`)
1. Fork or push the FlowTrack monorepo to your GitHub account.
2. Sign in to [Render](https://dashboard.render.com).
3. Click **New** > **Blueprint**.
4. Connect your GitHub repository. Render automatically reads `render.yaml` from the root.
5. In the Blueprint configuration:
   - Provide your `DATABASE_URL` (from Neon or Supabase).
   - Set `CORS_ORIGIN` to your Vercel URL (e.g. `https://flowtrack-web.vercel.app`).
6. Click **Apply**. Render will trigger the build and deploy.

### Method B: Manual Web Service Setup on Render
1. Click **New +** > **Web Service**.
2. Select your repository.
3. Configure the service settings:
   - **Name**: `flowtrack-api`
   - **Language**: `Node`
   - **Branch**: `master` (or `main`)
   - **Region**: Same region as your database (e.g. Oregon / Ohio)
   - **Build Command**:
     ```bash
     npm ci && npm run build:shared && npm run db:generate && npm run build:api
     ```
   - **Start Command**:
     ```bash
     node apps/api/dist/server.js
     ```
   - **Plan Type**: `Free`
4. Add the following **Environment Variables**:

| Variable | Recommended Production Value | Note |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production optimizations |
| `PORT` | `5000` | Render binds traffic automatically |
| `DATABASE_URL` | `postgresql://...` | Your pooled PostgreSQL connection URL |
| `CORS_ORIGIN` | `https://flowtrack-web.vercel.app` | Frontend production origin |
| `JWT_ACCESS_SECRET` | *(64-char random string)* | Used to sign short-lived access tokens |
| `JWT_REFRESH_SECRET`| *(64-char random string)* | Used to sign refresh tokens |
| `ACCESS_TOKEN_EXPIRES_IN` | `15m` | Access token lifespan |
| `REFRESH_TOKEN_EXPIRES_IN` | `7d` | Refresh token lifespan |

5. Under **Advanced**, set **Health Check Path** to `/health`.
6. Click **Create Web Service**.

> [!NOTE] Handling Render Free Tier Sleep (Cold Starts)
> Free Render instances spin down after 15 minutes of inactivity. The first request after sleep takes 30-50 seconds to wake up.
> **Zero-Cost Mitigation**: Set up a free HTTP ping on [Cron-job.org](https://cron-job.org) or [UptimeRobot](https://uptimerobot.com) targeting `https://flowtrack-api.onrender.com/health` every 10 minutes to keep the instance warm 24/7.

---

## 4. Step 3: Frontend Deployment on Vercel

1. Sign in to [Vercel](https://vercel.com) using your GitHub account.
2. Click **Add New...** > **Project** and select your `flowtrack` repository.
3. Configure the project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click Edit and select `apps/web`
   - **Build Command**: `npm run build:shared && npm run build` (or override with `npm run build`)
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
4. Expand **Environment Variables** and add:

| Variable | Value | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://flowtrack-api.onrender.com/api/v1` | Backend REST API endpoint |
| `VITE_WS_URL` | `https://flowtrack-api.onrender.com` | Backend WebSocket base URL |

5. Click **Deploy**. Vercel compiles the Vite project and generates a live edge URL (e.g. `https://flowtrack-web.vercel.app`).
6. Copy your Vercel URL and update `CORS_ORIGIN` in Render to match.

---

## 5. Step 4: Verification & Smoke Test Checklist

Once both services are running:
1. **Health Check**: Open `https://flowtrack-api.onrender.com/health` in your browser. Expect `{"status":"ok","service":"flowtrack-api"}`.
2. **REST Probe**: Open `https://flowtrack-api.onrender.com/api/v1`. Expect `{"success":true,"message":"FlowTrack REST API v1 is operational"}`.
3. **Login Journey**:
   - Open your Vercel app.
   - Click "Sign in as Admin (System Administrator)".
   - Verify instant redirect to `/dashboard` with aggregated statistics.
4. **WebSocket Test**:
   - Open the app in two separate browser tabs or windows.
   - Navigate to `/kanban` on both.
   - Drag or move an issue card on Tab 1.
   - Verify the card moves instantly on Tab 2 via real-time WebSocket broadcast without refreshing.
5. **In-App Notification Test**:
   - In Tab 1, post a comment on an issue assigned to Developer.
   - In Tab 2 (logged in as Developer), observe the Notification Bell badge display `1 new` with real-time audio/visual alert.

---

## 6. Local Multi-Container Deployment via Docker Compose

To test the entire production stack locally in isolated Docker containers:

```bash
# 1. Start Postgres, Express API, and Nginx Web in background
docker-compose up --build -d

# 2. Check container health status
docker-compose ps

# 3. View streaming logs
docker-compose logs -f api

# 4. Access local applications:
#    Frontend: http://localhost:3000
#    Backend:  http://localhost:5000/api/v1
#    Health:   http://localhost:5000/health

# 5. Stop containers and preserve database volume:
docker-compose down
```
