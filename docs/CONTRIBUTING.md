# Contributing to **Outfitter**

🌟 Thank you for your interest in improving Outfitter, the multi-tenant SaaS for hunting & fishing outfitters!  
This guide explains everything you need to know to get productive, follow project standards, and submit high-quality contributions.

---

## 1. Development Environment

### 1.1 Quick Setup

```bash
git clone https://github.com/cwilk3/Outfitter.git
cd Outfitter

# one-command bootstrap (verifies tools, installs deps, sets up DB, runs dev servers)
./setup-dev-environment.sh
```

What the script does:

| Step | Action |
|------|--------|
| 1 | Checks **Node 18+** & **PostgreSQL** |
| 2 | `npm install` for root workspace |
| 3 | Creates `.env` (sample values) |
| 4 | Runs Drizzle migrations `npm run db:push` |
| 5 | Offers to start dev servers (`npm run dev`) |

> Prefer manual control? Follow `GETTING_STARTED.md`.

### 1.2 Useful NPM scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Concurrent Vite frontend on `5173` & Express API on `3000` |
| `npm run build` | Production bundle (Vite + esbuild) |
| `npm run db:push` | Apply Drizzle migrations |
| `npm run lint` | ESLint + Prettier |
| `npm run test` | Vitest / Jest unit & integration |
| `npm run test:e2e` | Supertest end-to-end API |

---

## 2. Code Style & Standards

### 2.1 TypeScript

* **Strict mode** everywhere (`noImplicitAny`, `exactOptionalPropertyTypes`, etc.).
* Avoid `any`; use generics or shared `types` from `shared/schema.ts`.
* Prefer `async/await` over promise chains.

### 2.2 ESLint & Prettier

* Auto-fixable issues must be clean (`npm run lint --fix`).
* Pre-commit hooks will run lint + format.

### 2.3 React (client/)

* Functional components, hooks only.
* Extract logic to custom hooks in `src/hooks/`.
* Tailwind CSS: use `@apply` in class-heavy components; keep class lists <= 120 chars per line.

### 2.4 Express (server/)

* Modular route files under `server/routes/` (≤ 300 lines each).
* Always pass through:
  ```ts
  requireAuth,
  addOutfitterContext, // ensures multi-tenant scope
  validate(schema),    // Zod validation
  ```
* Use typed `AppError` for errors; never `res.status(500).send(err)` directly.

### 2.5 Commit Messages & Branch Names

* **Branches**: `feat/booking-calendar`, `fix/auth-token-refresh`, `chore/deps-update`.
* **Conventional Commits** (examples):
  * `feat(bookings): add per-day capacity check`
  * `fix(emailAuth): correct bcrypt salt rounds`
  * `docs: update ERD for payments table`

---

## 3. Pull Request Process

1. **Fork & branch** off `main`.  
2. **Sync** with upstream before working: `git fetch upstream && git rebase upstream/main`.
3. **Work in small commits**, push to your fork, open PR against `main`.
4. Fill PR template:
   * **What** – feature/fix summary
   * **Why** – link issue / discussion
   * **How** – high-level approach
   * **Screenshots / cURL** – for UI/API changes
5. Check list before requesting review:
   - [ ] `npm run lint` passes
   - [ ] `npm run test` passes (≥ 90 % coverage unchanged)
   - [ ] Added/updated docs
   - [ ] Environment secrets **not** committed (`git secrets --scan` clean)
6. Two reviewers approve ⇒ squash & merge (or merge commit for large features).

---

## 4. Testing Requirements

### 4.1 Unit & Integration

* **Vitest/Jest** for pure logic and service functions.
* Use **`drizzle-kit` test database** (schema auto-generated) for model tests.

### 4.2 API End-to-End (Supertest)

* Spin up Express app **in-memory**.
* Always seed **two outfitters** (`alpha`, `beta`) and assert isolation:

  ```ts
  it("does not leak bookings across tenants", async () => {
    const agent = await loginAs("admin@alpha.com");
    const res = await agent.get("/api/bookings").expect(200);
    expect(res.body.every((b: any) => b.outfitterId === 1)).toBe(true);
  });
  ```

### 4.3 Coverage

* Thresholds: **80 % lines / 100 % critical security paths** (`emailAuth.ts`, `outfitterContext.ts`).
* `npm run test -- --coverage` must pass in CI.

---

## 5. Documentation Guidelines

* **Update docs** in `docs/` or root Markdown files (`README`, `GETTING_STARTED`, etc.) whenever:
  * New endpoint or param is added
  * Schema changes (`shared/schema.ts`)
  * ENV variable added
* **ER Diagrams**: deliver updated PNG/SVG and source (dbdiagram.io, Draw.io).
* **Code comments**: public functions must have JSDoc/TSDoc.

Example:

```ts
/**
 * Generates a JWT with outfitter context.
 * @param user User record
 * @param outfitterId Tenant id
 * @returns signed JWT string (expires in 7 d)
 */
export function generateToken(user: User, outfitterId: number): string { ... }
```

---

## 6. Security Considerations

### 6.1 Multi-Tenant Data Isolation

* **Never** accept `outfitterId` from the client.  
  Use `req.context.outfitterId` injected by `addOutfitterContext` middleware.
* All **storage layer** methods must include `WHERE outfitter_id = ?`.
* Add a regression test whenever you touch:
  * `server/storage.ts`
  * `outfitterContext` middleware
  * JWT payload structure

### 6.2 Secrets & Environment

* Secrets live only in `.env` / deployment variables.
* Do **not** log JWTs, passwords, or full SQL queries in production.
* Use `dotenv-safe` to enforce required env vars locally & in CI.

### 6.3 Dependencies

* Keep dependencies updated (`npm outdated`).
* Run `npm audit --production` before each release.

### 6.4 Rate Limiting & Auth

* Heavy endpoints (`/api/public/bookings`) must apply `rateLimiter` middleware.
* When implementing new public routes, ensure they are **stateless** and **read-only** unless explicitly required.

---

## 7. Need Help?

* Open a GitHub Discussion or join `#outfitter-dev` Slack.
* For security vulnerabilities, **DO NOT** open public issues.  
  Email `security@outfitter.dev` with details – we respond within 24 h.

---

Happy hacking & thank you for making Outfitter better!  
— The Outfitter Core Team
