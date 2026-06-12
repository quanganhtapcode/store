# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Cát Hải POS** is a Point-of-Sale system with a React+Vite frontend (deployed on Vercel) and an Express.js backend with SQLite (deployed on VPS).

- **Production frontend:** `store-six-fawn.vercel.app`
- **Production backend:** `api.quanganh.org/v1/store`

## Commands

### Install dependencies
```bash
npm run install:all   # Install root + frontend + backend
```

### Development
```bash
npm run dev           # Start both frontend (port 3000) and backend (port 3001) concurrently
npm run dev:frontend  # Frontend only (cd frontend && npm run dev)
npm run dev:backend   # Backend only (cd backend && node server.cjs)
```

### Build & Deploy
```bash
npm run build              # Build frontend for production (output: frontend/dist)
./scripts/update-vps.sh    # Deploy backend to VPS
```

No linting or test scripts are configured in this project.

## Architecture

### Split Deployment Model
- **Frontend** is a pure SPA (no SSR). All API calls go to `VITE_API_URL` (env var). Push to `main` → Vercel auto-deploys.
- **Backend** runs on VPS via PM2 as `store-api`. Deploy via `update-vps.sh`.

### File Extension Conventions
- Frontend components: `.jsx`
- Backend files: `.cjs` (CommonJS — Node.js doesn't support ESM for the backend entry)

### Backend Structure
- `backend/server.cjs` — Express app setup, mounts all routes, serves static images from `backend/public/images/`
- `backend/config/database.js` — SQLite connection with WAL mode, all `CREATE TABLE IF NOT EXISTS` migrations run here on startup. **Add new tables/columns here**, not in separate migration files.
- `backend/routes/` — One file per feature domain (products, orders, stats, suppliers, reports)
- `backend/middleware/auth.js` — `verifyToken` middleware; tokens are 32-byte hex stored in memory (no persistence across restarts)

### Frontend Structure
- `frontend/src/App.jsx` — Routing and auth context. Protected routes require JWT token in localStorage.
- `frontend/src/components/POSView.jsx` — Main cashier interface (product search, cart, checkout)
- `frontend/src/components/admin/` — Admin dashboard views (Dashboard, Orders, Products, Suppliers, ImportView, Logs, Settings)
- `ImportView.jsx` is the largest component (~99KB) — handles stock imports, FIFO batch creation, inventory tracking

### Database Schema (Key Tables)
```sql
products(id TEXT PK,  -- PRD-XXXXXX
         name, brand, category, price INT, case_price INT, units_per_case INT,
         stock INT, cost_price INT, code TEXT, image TEXT, total_sold INT)

orders(id INT AUTO PK, order_code TEXT,  -- ORD-YYYYMMDD-NNNN
       total INT, original_total INT, discount INT,
       timestamp INT, items TEXT/JSON,  -- denormalized for receipt
       customer_name, payment_method, status, note)

order_items(id INT AUTO PK, order_id INT, product_id TEXT, quantity INT, price INT)
-- Normalized for analytics queries; migrated from JSON items on startup

inventory_batches(id, product_id, import_id, quantity, remaining, cost_price, created_at)
-- Tracks FIFO cost lots; created on stock import, decremented on sale

import_notes(id TEXT PK,  -- IMP-XXXXXX
             supplier_id, timestamp INT, total_cost INT, note TEXT, items TEXT/JSON)

suppliers(id TEXT PK, name, contact_person, phone, email, address, note, created_at INT, updated_at INT)

activity_logs(id INT AUTO PK, action TEXT, details TEXT, timestamp INT)
-- Actions: ADD_PRODUCT, UPDATE_PRODUCT, DELETE_PRODUCT, CREATE_ORDER, IMPORT_STOCK
```

### Image Handling
- Images uploaded as base64 in request body → saved as `backend/public/images/{product_id}.jpg`
- Served statically by Express at `/images/{id}.jpg`
- DB stores path: `/images/{id}.jpg`

### Authentication Flow
1. POST `/api/auth/login` with `{username, password}` → returns token (or prompts for OTP if 2FA enabled)
2. Token stored in `localStorage`, sent as `Authorization: Bearer <token>` header
3. `verifyToken` middleware validates against in-memory token store (tokens expire in 24h, lost on server restart)

### Adding New API Routes
1. Create/modify a file in `backend/routes/`
2. Mount it in `backend/server.cjs`
3. If new DB tables/columns are needed, add `CREATE TABLE IF NOT EXISTS` or `ALTER TABLE` (guarded) in `backend/config/database.js` `initDatabase()`

### Changing Database Schema
1. Update `initDatabase()` in `backend/config/database.js` with `CREATE TABLE IF NOT EXISTS` or conditional `ALTER TABLE`
2. Update `docs/DATABASE_SCHEMA.md`

## Environment Variables

```bash
# Frontend (set in Vercel dashboard or .env.local)
VITE_API_URL=https://api.quanganh.org/v1/store

# Backend (.env at backend root)
PORT=3001
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_password
SECRET_KEY=your_secret_key
OTP_SECRET=your_otp_secret
DB_PATH=                   # Optional: override database path
```

## VPS Operations

```bash
# Check server status
ssh root@203.55.176.10 "pm2 status"

# View logs
ssh root@203.55.176.10 "pm2 logs store-api --lines 50"

# Restart server
ssh root@203.55.176.10 "pm2 restart store-api"
```
