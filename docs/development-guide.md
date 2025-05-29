# 📖 Outfitter Development Guide

Welcome to **Outfitter** — a multi-tenant SaaS platform that helps hunting & fishing outfitters run their business end-to-end.  
This guide walks through the architecture, code layout and daily workflows so you can ship features with confidence.

---

## 1. Architecture Overview

| Layer | Tech | Purpose |
|-------|------|---------|
| **Client** | React 18 + TS, Vite, Tailwind, TanStack Query | Responsive admin UI + public booking page |
| **Server** | Node.js, Express + TS | REST API, auth, business logic |
| **Database** | PostgreSQL (Drizzle ORM) | Multi-tenant data store |
| **Shared** | `shared/schema.ts` | Single source of truth for DB schema & TS types |
| **Auth** | JWT + bcrypt + HTTP-only cookies | Secure login, tenant context |
| **Infra** | Docker-optional, Neon/Supabase/Local PG | Dev/prod parity |

▲ High-level flow  
Browser ↔︎ React client ↔︎ `fetch/axios` → Express API → Storage layer → Postgres

---

## 2. Frontend Implementation

### 2.1 Entry & Routing
```
client/src/main.tsx      // mounts <App/>
client/src/App.tsx       // Wouter routes
```
Routes are split into:
* **Public** – `/public/:outfitterId` booking flow
* **Auth** – `/auth`, `/onboarding`
* **Protected** – everything else (guarded by `useAuth()`)

### 2.2 State Management
* **TanStack Query** for server state (`queryClient` in `client/src/lib`)
* Auth state lives in `useAuth` hook (cookie → `/api/auth/user` endpoint).

### 2.3 UI Library
* Tailwind CSS + shadcn/ui.
* Components grouped by domain:
  ```
  components/
    Dashboard/
    Calendar/
    Sidebar/
    ui/      // generic primitives
  ```

### 2.4 Forms & Validation
* `react-hook-form`
* `zod` schemas imported directly from shared types where possible.

---

## 3. Backend Implementation

### 3.1 Project Layout
```
server/
  index.ts            // app bootstrap
  routes/             // domain-modular handlers
  middleware/
      requireAuth.ts
      outfitterContext.ts
      errorHandler.ts
  utils/              // mailer, logger, etc.
  emailAuth.ts        // auth helpers
  db.ts               // Neon / local PG connection
```

### 3.2 Routes
* Express Router per domain (`routes/bookings.ts`, `routes/experiences.ts`, …).
* Always included middleware chain:
  ```
  requireAuth → addOutfitterContext → validate(Zod) → handler
  ```

### 3.3 Storage Layer
`server/storage.ts` abstracts Drizzle queries.  
Every method receives `outfitterId` first to guarantee tenant isolation.

---

## 4. Authentication & Multi-Tenant Isolation

1. **Registration / Login**  
   `/api/auth/register` → hash password (bcrypt12) → store user + default outfitter.  
   `/api/auth/login` → verify password → issue JWT `{ userId, outfitterId, role }`.

2. **HTTP-only Cookie**  
   Token stored as `token` cookie (`SameSite=Lax`, 7 days).

3. **Middleware**  
   ```
   requireAuth     // verifies & decodes JWT → req.user
   outfitterContext// sets req.context.outfitterId
   ```

4. **Database Queries** – Storage layer auto-appends `WHERE outfitter_id = $1`.

5. **Cross-Tenant Users** – `user_outfitters` table lets a guide/admin switch tenants; token regenerated on switch.

---

## 5. Database Schema & Relationships

See `shared/schema.ts` + ER diagram in `docs/database_diagram.md`.

Key points:

* Primary tenant key: `outfitters.id`
* Every business table contains `outfitterId` FK.
* Junction tables (e.g. `experience_guides`) store only FK refs + `outfitterId`.
* Enum types for `role`, `booking_status`, `payment_status`, `category`.
* Important indexes: `(outfitter_id)` on high-traffic tables, `IDX_session_expire` on `sessions`.

---

## 6. Key Components & Routes

| Area | FE Component(s) | API Route(s) | Notes |
|------|-----------------|--------------|-------|
| Dashboard | `pages/Dashboard.tsx`, cards in `components/Dashboard` | `/api/dashboard/*` | Revenue, occupancy |
| Experiences | `pages/Experiences.tsx` | `/api/experiences` | CRUD + add-ons |
| Locations | part of Experiences UI | `/api/locations` | M:M `experience_locations` |
| Calendar | `pages/CalendarPage.tsx` | `/api/calendar` | Availability slots |
| Bookings | `pages/Bookings.tsx` | `/api/bookings` | create / update / cancel |
| Customers | `pages/Customers.tsx` | `/api/customers` | Contacts & history |
| Staff | `pages/Staff.tsx` | `/api/staff` | Guides & roles |
| Payments | `pages/Payments.tsx` | `/api/payments` | Stripe / QB stubs |
| Settings | `pages/Settings.tsx` | `/api/settings` | Branding, keys |
| Public Booking | `pages/PublicBooking.tsx` | `/api/public/bookings` | No auth, rate-limited |

---

## 7. Local Development Setup

```bash
# clone
git clone https://github.com/cwilk3/Outfitter.git
cd Outfitter

# one-shot bootstrap
./setup-dev-environment.sh    # verifies Node + PG, installs deps, creates .env, migrates DB

# OR manual ✍️
nvm install 18
npm install
cp .env.example .env          # adjust DATABASE_URL, JWT_SECRET, …
npm run db:push
npm run dev                   # Vite (5173) + API (3000)
```

Useful scripts:

| Script | What it does |
|--------|--------------|
| `npm run dev` | concurrent client + server HMR |
| `npm run build` | production bundles |
| `npm run db:push` | Drizzle migrations |
| `npm run db:studio` | web DB explorer |
| `npm run test` | jest/vitest suite |
| `./test-api.sh` | smoke-test auth & tenant isolation |

---

## 8. Common Development Tasks

| Task | How-To |
|------|--------|
| **Add a DB column** | 1) edit `shared/schema.ts` 2) `npx drizzle-kit generate` 3) `npm run db:push` 4) update types/UI |
| **Create new protected route** | `server/routes/<domain>.ts` → add handler with `requireAuth`, `addOutfitterContext`, Zod validate |
| **Public endpoint** | Same as above but **omit** `requireAuth`; add `rateLimiter` middleware |
| **Add frontend page** | `pages/` component → add to `App.tsx` route + sidebar nav |
| **Call API** | use `lib/apiRequest` (fetch wrapper w/ cookie creds) + TanStack Query |
| **Write unit test** | create file in `tests/` – jest for ts utils, supertest for API |
| **Link guide to experience** | call `POST /api/experience-guides` with `{ experienceId, guideId, isPrimary }` |
| **Seed data** | `tests/seed.ts` helpers or direct SQL via Drizzle Studio |
| **Switch tenant** | POST `/api/auth/switch` (TODO page) → receives new cookie scoped to selected outfitter |
| **Debug booking flow** | 1) enable verbose logs via `LOG_LEVEL=debug` 2) inspect `server/routes/public/bookings.ts` 3) run `test-api.sh` |

---

## Contributing Checklist

1. Branch off `main`: `git checkout -b feat/your-thing`
2. Follow **eslint/prettier** (`npm run lint --fix`).
3. Write tests + docs.
4. Ensure multi-tenant isolation tests pass.
5. `git secrets --scan` (no keys!).
6. Open PR, fill template, request review.

Happy hacking & tight lines!  
— Outfitter Core Team
