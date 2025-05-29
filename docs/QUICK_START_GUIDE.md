# 🚀 Outfitter Quick-Start Guide  
_Get productive in **30 minutes** by following the five highest-impact tasks._

---

## Prerequisites (5 min)

| Tool | Version | Check |
|------|---------|-------|
| Node.js | 18 + | `node -v` |
| PostgreSQL | 14 + (local **or** Neon/Supabase) | `psql --version` |
| npm | comes with Node | `npm -v` |

```bash
# clone and install
git clone https://github.com/cwilk3/Outfitter.git
cd Outfitter
npm install

# prepare .env (sample values are fine for now)
cp .env.example .env
npm run db:push        # apply Drizzle migrations
npm run dev            # Vite (5173) + API (3000)
```

---

## 1️⃣ Review Authentication Flow

| File / Concept | Why it matters |
|----------------|----------------|
| `server/emailAuth.ts` | JWT creation, bcrypt hashing |
| `server/middleware/requireAuth.ts` | Protects private routes |
| `client/src/hooks/useAuth.ts` | React-side auth state |

### Try it out

```bash
# register a user
curl -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@alpha.com","password":"hunter2","firstName":"Demo","lastName":"User","outfitterId":1}'

# login
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@alpha.com","password":"hunter2"}' \
  -c cookie.txt      # save HTTP-only cookie
```

Check that the cookie `token` is set.  
Open the app at `http://localhost:5173`, log in with the same credentials, and note that protected dashboard routes load.

> 🔍 **Debug tip:** Add `console.log(req.user)` inside `requireAuth` middleware to inspect the decoded JWT payload.

---

## 2️⃣ Examine Database Schema

Main file: `shared/schema.ts` (Drizzle ORM + Zod).  
Focus on multi-tenant columns (`outfitterId`) and relations.

### Explore schema quickly

```bash
npm run db:studio   # opens Drizzle Studio in browser
```

Tasks:

1. Verify **`outfitters` ⇢ `experiences`** relation (`locationId`, `outfitterId`).
2. Inspect enum types `booking_status`, `payment_status`, `role`.
3. Use `SELECT * FROM users LIMIT 5;` to confirm your new account exists.

> 📝 **Exercise:** sketch an ER diagram on paper to cement understanding.

---

## 3️⃣ Test API Endpoints

Goal: confirm CRUD + multi-tenant isolation.

### Manual test (cURL)

```bash
# (cookie.txt contains auth token from step 1)
curl -b cookie.txt http://localhost:3000/api/bookings | jq
```

You should receive **only** bookings whose `outfitterId` equals the token’s outfitter.

### Automated test (Jest + Supertest)

Create `tests/bookings.spec.ts`:

```ts
import request from "supertest";
import app from "../server/index";

describe("Bookings API", () => {
  it("returns tenant-scoped bookings", async () => {
    const agent = request.agent(app);
    await utils.login(agent, "demo@alpha.com", "hunter2");   // helper logs in & sets cookie
    const res = await agent.get("/api/bookings").expect(200);
    expect(res.body.every((b: any) => b.outfitterId === 1)).toBe(true);
  });
});
```

Run tests:

```bash
npm test
```

---

## 4️⃣ Evaluate Frontend Components

Directory: `client/src/components`

1. Open `Dashboard/RevenueCard.tsx` – note TanStack Query usage.
2. Check `Sidebar/Sidebar.tsx` for **role-based menu rendering**.
3. Verify `hooks/useAuth.ts` properly gates protected routes (`App.tsx`).

### Hot-reloading tweak

Add a placeholder prop to `components/ui/Button.tsx` and watch the browser update instantly—confirm Vite HMR is working.

> 🎨 **Task:** shrink the sidebar on mobile (`sm:` Tailwind breakpoint) to verify responsive design.

---

## 5️⃣ Assess Outstanding Items

From `CODEBASE_REVIEW_FOR_DEVELOPER.md` (15 % work remaining):

| Priority | Item | Suggested First Action |
|----------|------|------------------------|
| 🔴 High | **Public Booking Interface** | Open `client/src/pages/PublicBooking.tsx`; list TODOs in comments. |
| 🔴 High | **Stripe Payment Integration** | Examine `server/routes/payments.ts` stub; create `.env` `STRIPE_SECRET_KEY`. |
| 🟠 Medium | **Email Notifications** | Review `server/utils/email.ts` (SendGrid); send test email with sandbox mode. |
| 🟠 Medium | **UI Polish** | Run Lighthouse audit in Chrome -> fix color-contrast. |
| 🟡 Future | **Analytics & Mobile App** | Not in scope for quick start. |

Choose one high-priority item, create a branch (`feat/stripe-payments`), and push your first PR!

---

## 🎉 You’re Ready!

By completing the five steps above you now:

✔ Understand auth mechanics  
✔ Know the database & data isolation rules  
✔ Can hit and test API routes confidently  
✔ Can navigate & tweak React components  
✔ Have a roadmap for remaining high-value work  

Happy hacking and welcome to the **Outfitter** team!  
Questions? Open an issue or drop a message in **#outfitter-dev** Slack.
