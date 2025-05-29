# 🐞 Outfitter Debugging Guide

_A field manual for finding & fixing issues across the full-stack._

---

## 0  Golden Rules

1. **Reproduce** → **Isolate** → **Fix** → **Test** → **Document**.  
2. Always run `LOG_LEVEL=debug npm run dev` to get verbose server logs.  
3. Keep **two tenants** (`alpha`, `beta`) in your local DB to catch isolation leaks.

---

## 1  Authentication Issues

| Symptom | Checks & Fixes |
|---------|----------------|
| `401 Unauthorized` on protected route | 1. `curl -I http://localhost:3000/api/bookings -b cookie.txt` – is `token` cookie present?<br>2. Decode token: `node -e "console.log(require('jsonwebtoken').decode(process.argv[1]))" $(cat token.txt)`.<br>3. Expired? Re-login.<br>4. Inspect middleware order → **`requireAuth` must precede handler**. |
| Invalid password even when correct | Ensure bcrypt rounds match:<br>`grep saltRounds server/emailAuth.ts` (should be `12`). |
| Cannot switch tenant | `POST /api/auth/switch` should issue **new** cookie.<br>Check `outfitterId` in decoded token. |

**Debug commands**

```bash
# save auth cookie
curl -c cookie.txt -X POST http://localhost:3000/api/auth/login \
     -H 'Content-Type: application/json' \
     -d '{"email":"admin@alpha.com","password":"hunter2"}'

# view cookie
cat cookie.txt | grep token > token.txt
```

---

## 2  Multi-Tenant Isolation Bugs

### Detection

```bash
# EXPECT: only outfitter 1 bookings
curl -b cookie.txt http://localhost:3000/api/bookings | jq '[.[].outfitterId] | unique'
```

If multiple IDs appear:

1. Search queries missing tenant filter  
   `grep -R "FROM bookings" server | grep -v outfitter_id`
2. Ensure **all** storage methods accept `outfitterId` param.
3. Verify `addOutfitterContext` middleware is mounted **globally** (`app.use`).

### Fix

```ts
// BAD
db.select().from(bookings)

// GOOD
db.select().from(bookings).where(eq(bookings.outfitterId, ctx.outfitterId))
```

Add regression test:

```ts
it("does not leak customers", async () => {
  const res = await agent.get("/api/customers");
  expect(res.body.every((c: any) => c.outfitterId === 1)).toBe(true);
});
```

---

## 3  Database Connection Problems

| Error | Resolution |
|-------|------------|
| `ECONNREFUSED localhost:5432` | Postgres not running: `brew services start postgresql@14` |
| `password authentication failed` | Check `.env` → `DATABASE_URL`, no quotes inside URL. |
| `relation "users" does not exist` | Run migrations: `npm run db:push`. |

### Quick health check

```bash
psql $DATABASE_URL -c "\dt"          # list tables
npm run db:studio                    # Drizzle web UI
```

---

## 4  API Endpoint Troubleshooting

1. **Supertest smoke:**  
   `npx tsx tests/smoke/bookings.smoke.ts`
2. **cURL reproducibility:**  

```bash
curl -v -b cookie.txt -X POST http://localhost:3000/api/bookings \
     -H 'Content-Type: application/json' \
     -d @payload.json
```

3. Add **`debug()`** in route:

```ts
import debug from "debug";
const log = debug("api:bookings");

log("payload %o", req.body);
```

Enable namespace: `DEBUG=api:* npm run dev`.

---

## 5  Frontend React Debugging

| Tool | Usage |
|------|-------|
| React DevTools | Inspect component tree, check `useAuth` state. |
| TanStack Query Devtools | `import { ReactQueryDevtools }` in `App.tsx` to view query cache & errors. |
| Vite HMR Logs | Browser console shows fast-refresh errors. |

### Common Issues

* **Blank page** → Check network tab for `/api/auth/user` 401 loop.  
* **Infinite re-render** → Verify hook deps (`useEffect([value])`).  
* **Zod validation errors** bubbling → inspect `error.data` from `apiRequest`.

---

## 6  Performance Optimization

### Backend

| Metric | Command |
|--------|---------|
| Slow query | `EXPLAIN ANALYZE` in psql or enable PG `log_min_duration_statement = 50` ms |
| High CPU | `node --prof server/index.ts` then `node --prof-process isolate-*.log` |
| Large payload | `express.json({ limit: "1mb" })` & inspect `Content-Length` via cURL `-I`. |

*Add missing indexes:*  

```sql
CREATE INDEX IF NOT EXISTS idx_bookings_outfitter_status
  ON bookings (outfitter_id, status);
```

### Frontend

1. Run Lighthouse (`cmd+shift+I → Lighthouse` in Chrome).  
2. Bundle-analyse: `npm run build && npx vite-bundle-visualizer dist/**/*.html`.  
3. Use React.lazy for heavy pages:

```ts
const CalendarPage = lazy(() => import("@/pages/CalendarPage"));
```

---

## 7  Security Auditing

### Checklist

| Area | Command |
|------|---------|
| Dependency vulns | `npm audit --production` |
| Secret scanning  | `git secrets --scan` |
| Rate-limit test  | `hey -n 1000 -q 50 http://localhost:3000/api/public/bookings` (expect 429) |
| JWT tampering    | Change `role` in decoded token → should fail server-side `requireAuth`. |

### OWASP Zap Baseline

```bash
docker run -t ghcr.io/zaproxy/zap-baseline:latest -t http://localhost:5173 -w zap_report.html
```

Review `zap_report.html` for XSS/CORS/LFI issues.

---

## 8  Toolbox

| Tool | Install | Notes |
|------|---------|-------|
| **pgcli** | `pip install pgcli` | Autocomplete SQL client |
| **httpie**| `brew install httpie` | Friendlier cURL |
| **nodemon** | `npm i -D nodemon` | Auto-restart API |
| **why-did-you-render** | `import wdyr` in `main.tsx` | Detect React re-renders |
| **clinic.js** | `npm i -g clinic` | CPU & memory profiling |

---

### Quick “Everything OK?” Script

```bash
./test-api.sh                # auth + CRUD + isolation
npm run lint && npm test     # code quality
npm run build                # bundle passes
```

If the script is green, you’re good to ship! 🚀
