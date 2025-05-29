# Getting Started with **Outfitter**

Welcome to the Outfitter codebase!  
This guide will get you productive quickly and point you to the most important concepts for day-to-day development.

---

## 1  Set Up Your Development Environment

### Prerequisites
| Tool | Version | Notes |
|------|---------|-------|
| Node.js | **18 +** | Includes `npm` |
| PostgreSQL | 14 + | Local or cloud (Neon, Supabase, Railway…) |
| Git | any | for VCS |

### One-Command Setup (recommended)
From the repo root:

```bash
./setup-dev-environment.sh
```

What it does:

1. Verifies Node & Postgres.
2. Installs `npm` dependencies.
3. Creates **.env** with sample values if missing.
4. Runs Drizzle migrations (`npm run db:push`).

> 💡 **Tip:** The script is idempotent—run it again after adding new deps or changing env vars.

### Manual Setup

```bash
# install deps
npm install

# configure environment
cp .env.example .env
# edit DATABASE_URL, JWT_SECRET, SESSION_SECRET …

# prepare database
npm run db:push
```

---

## 2  Understand the Project Structure

```
outfitter/
├── client/                 React 18 + TS
│   ├── src/
│   │   ├── components/     UI & feature components
│   │   ├── pages/          Route views
│   │   ├── hooks/          e.g. useAuth, useQuery*
│   │   ├── lib/            queryClient, API helpers
│   │   └── App.tsx
├── server/                 Express + TS
│   ├── middleware/         auth, error handler, outfitterContext
│   ├── routes/             modular route handlers
│   ├── utils/              helpers (logger, email, etc.)
│   ├── emailAuth.ts        auth implementation
│   ├── db.ts               Neon connection
│   └── index.ts            server entry
├── shared/                 Types shared FE ↔︎ BE
│   └── schema.ts           Drizzle models + Zod schemas
└── tests/                  vitest / supertest specs
```

Key points:

* **Monorepo, single `package.json`** – workspaces not required, but you can add them.
* **Strict TypeScript** everywhere. No `any` is allowed in CI.
* **shared/schema.ts** is the source of truth for DB & Types.

---

## 3  Working with the Multi-Tenant Architecture

### How Tenant Isolation Works

* Every business entity has an `outfitterId` column.
* **Middleware `outfitterContext`** injects the tenant id into `req.context`.
* Storage layer (`server/storage.ts`) automatically filters by tenant id.
* JWT token includes `{ userId, outfitterId }`.

```typescript
// Example: retrieving bookings for current tenant
export async function getBookings(req: AuthReq, res: Res) {
  const { outfitterId } = req.context;
  const bookings = await storage.getBookings(outfitterId);
  res.json(bookings);
}
```

### Best Practices

1. **Always use `req.context.outfitterId`** – never trust client-supplied ids.
2. **Don’t bypass Storage layer**; it enforces tenant WHERE clauses.
3. **Write tests** with at least two outfitters to guard against bleed-through.

---

## 4  Run and Test the Application

### Dev Mode (hot-reload client & server)

```bash
npm run dev          # concurrently runs Vite + tsx
```

Open:

* Frontend → http://localhost:5173  
* API → http://localhost:3000

### Building for Production

```bash
npm run build        # vite build + esbuild server bundle
npm run start        # launches dist/index.js
```

### Running Tests

```bash
# unit + integration
npm test             # jest/vitest

# API e2e with supertest
npm run test:e2e
```

Writing a new test:

```typescript
import request from "supertest";
import app from "../server/index";

describe("GET /api/experiences", () => {
  it("returns only tenant experiences", async () => {
    const jwt = await utils.loginAs("admin@alpha.com"); // helper
    await request(app)
      .get("/api/experiences")
      .set("Cookie", [`token=${jwt}`])
      .expect(200)
      .expect(res =>
        expect(res.body.every((e: any) => e.outfitterId === 1)).toBe(true)
      );
  });
});
```

> 🔍 **Tip:** Seed data helpers live in `tests/seed.ts`.

---

## 5  Contributing Guidelines

### Branch & Commit

1. Fork & branch off `main`:  
   `git checkout -b feat/booking-calendar`
2. Keep commits atomic:  
   `fix: ensure outfitters cannot access other bookings`
3. Run `npm run lint && npm run test` before pushing.

### Pull Request Checklist

- [ ] Description explains *why* + screenshots/GIFs.
- [ ] Passing CI (tests, type-check, lint).
- [ ] Added/updated docs if needed.
- [ ] No secrets committed (`git secrets --scan`).

### Coding Standards

* **Type first** – define Zod/TypeScript types before coding logic.
* **Prefer composition** – small React components/hooks over monolith UI.
* **Error handling** – throw typed `AppError` and let `errorHandler` middleware respond.
* **Environment safety** – read secrets from `process.env`, never hard-code.

### Useful NPM Scripts

| Script | Purpose |
|--------|---------|
| `dev` | hot-reload client & server |
| `build` | create production bundles |
| `db:push` | apply Drizzle migrations |
| `lint` | eslint + prettier |
| `test` | unit/integration tests |
| `test:watch` | vitest watch mode |

---

## Developer Productivity Tips

* **VS Code**: install _Drizzle ORM_ & _Tailwind IntelliSense_ extensions.
* **DB Studio**: `npm run db:studio` opens a web UI for querying tables.
* **API Autocomplete**: Insomnia/Postman environment `env/api_env.json` is ready.
* **Generate Types from schema**: run `npx drizzle-kit generate`.

---

Happy hacking & welcome to the Outfitter team!  
Questions or ideas? Open a GitHub Discussion or ping the **#outfitter-dev** Slack channel.
