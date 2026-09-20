# 🍽️ Enterprise Multi-Tenant Restaurant POS Platform

[![CI Pipeline](https://github.com/divyaranjanpradhan21-star/pos-Enterprise/actions/workflows/ci.yml/badge.svg)](https://github.com/divyaranjanpradhan21-star/pos-Enterprise/actions)
![Node.js Version](https://img.shields.io/badge/node.js-v20-brightgreen.svg)
![pnpm Workspace](https://img.shields.io/badge/pnpm-v12-orange.svg)
![PostgreSQL](https://img.shields.io/badge/database-Supabase--PostgreSQL--16-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

An enterprise-grade, multi-tenant, offline-tolerant **Restaurant Operations and POS Platform** built as a modular monorepo. Handles high-concurrency order processing, kitchen display queues (KDS), split payments, gap-free legal invoicing, inventory deduction via recipe bill of materials (BOM), and multi-tenant row-level security.

---

## 🏗️ Architecture & Monorepo Layout

```
pos-Enterprise/
├── apps/
│   ├── api/             # NestJS Modular Monolith API (Render / Docker)
│   └── pos-web/         # React 18 Offline-First PWA (Vite / Vercel)
├── packages/
│   ├── domain/          # Pure immutable calculations (decimal.js, fast-check property tests)
│   └── db/              # Prisma 22-table schema & PostgreSQL RLS policies
├── Dockerfile           # Multi-stage production container build
├── render.yaml          # Render service deployment blueprint
├── supabase_schema.sql  # Complete Supabase PostgreSQL 16 DDL & trigger script
└── pnpm-workspace.yaml  # Monorepo workspace configuration
```

---

## ⚡ Core Specifications & Invariants

1. **Exact Financial Mathematics (`BR-MON-001`)**: Zero floating-point drift. All money calculations leverage `decimal.js` with banker's rounding.
2. **Multi-Tenant RLS Security (`NFR-ISO-001`)**: PostgreSQL Row-Level Security (`FORCE ROW LEVEL SECURITY`) bound to session variables (`app.current_tenant_id`).
3. **Gap-Free Legal Invoicing (`BR-INV-001`)**: Row-level locking procedure (`FOR UPDATE`) generating sequential invoice numbers (`INV-2026-BR001-00001`).
4. **Append-Only Ledgers (`BR-LED-001`)**: PostgreSQL triggers blocking `UPDATE` and `DELETE` on inventory transactions and audit logs.
5. **Offline Outbox Queue**: Client side Dexie.js (IndexedDB) storing local orders with UUIDv7 IDs, auto-syncing upon network recovery.

---

## 🧪 Automated Testing & Verification

Run the entire automated verification suite:

```bash
# 1. Run domain calculation & property-based tests (100% pass)
pnpm --filter @pos/domain test

# 2. Compile and build all workspace packages
pnpm build
```

---

## 🚀 Step-by-Step Production Deployment Guide

### Step 1: Database Setup (Supabase)

1. Open your Supabase Dashboard: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Go to **SQL Editor** $\rightarrow$ Click **New Query**.
3. Open [`supabase_schema.sql`](./supabase_schema.sql) in this repo, copy all SQL lines, paste into the editor, and click **Run**.
4. Retrieve your **Connection String** from *Project Settings $\rightarrow$ Database*:
   - Use the **Transaction Pooler** (`port 65432`) for `DATABASE_URL`.

---

### Step 2: Push Code to GitHub

```bash
git add .
git commit -m "feat: complete production ready enterprise POS platform"
git push -u origin main
```
Repository target: [`divyaranjanpradhan21-star/pos-Enterprise`](https://github.com/divyaranjanpradhan21-star/pos-Enterprise.git)

---

### Step 3: Deploy Backend API (Render)

1. Go to [Render Dashboard](https://dashboard.render.com) $\rightarrow$ **New Web Service**.
2. Connect `divyaranjanpradhan21-star/pos-Enterprise`.
3. Configuration:
   - **Environment**: `Docker` (Dockerfile Path: `./Dockerfile`)
   - **Health Check Path**: `/health`
4. Set Environment Variables:
   - `NODE_ENV` = `production`
   - `PORT` = `3000`
   - `DATABASE_URL` = `postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:65432/postgres?pgbouncer=true`
   - `JWT_SECRET` = `[Your secure 64-char secret]`
5. Click **Create Web Service**. Note your API URL (e.g. `https://pos-api.onrender.com`).

---

### Step 4: Deploy Frontend PWA (Vercel)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard) $\rightarrow$ **Add New Project**.
2. Import `divyaranjanpradhan21-star/pos-Enterprise`.
3. Configuration:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `apps/pos-web`
   - **Build Command**: `pnpm build`
   - **Output Directory**: `dist`
4. Add Environment Variables:
   - `VITE_API_URL` = `https://pos-api.onrender.com`
   - `VITE_SUPABASE_URL` = `https://hploabbozxurvwxhurtj.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `[Your Supabase Anon Key]`
5. Click **Deploy**.

---

## 📜 License

Distributed under the MIT License.
