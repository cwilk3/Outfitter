# 🐘 PostgreSQL Setup Guide for **Outfitter**

_A 10-minute walkthrough to get a local (or cloud) database ready for development._

---

## 1 Install PostgreSQL on macOS

### 1.1 Homebrew (recommended)

```bash
# Install Homebrew if not present
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install PostgreSQL 14 (LTS)
brew install postgresql@14

# Start service on login
brew services start postgresql@14
```

Verify:

```bash
psql --version         # → psql (PostgreSQL) 14.x
```

### 1.2 Postgres.app (GUI alternative)

1. Download **Postgres.app** – https://postgresapp.com  
2. Drag to Applications and launch.  
3. Click **Initialize** to start a server (default port 5432).

Either method is fine—pick one.

---

## 2 Create the Outfitter Database

```bash
createdb outfitter      # CLI
```

If you prefer SQL:

```bash
psql postgres
postgres=# CREATE DATABASE outfitter;
postgres=# \q
```

---

## 3 Create a Database User

Create a role with a strong password and full rights on the new DB.

```bash
# Replace *** with your chosen password
psql -d outfitter -c "CREATE ROLE outfitter_user WITH LOGIN ENCRYPTED PASSWORD '***';"
psql -d outfitter -c "GRANT ALL PRIVILEGES ON DATABASE outfitter TO outfitter_user;"
```

> 🔒  In production grant only the rights the app needs (CONNECT, SELECT, INSERT, UPDATE…).

---

## 4 Configure Connection Settings

Copy `.env.example` → `.env` then edit `DATABASE_URL`:

```
DATABASE_URL="postgresql://outfitter_user:YOUR_PASSWORD@localhost:5432/outfitter"
```

Optional tweaks:

| Var | Default | Purpose |
|-----|---------|---------|
| `PGSSLMODE` | `prefer` | SSL mode for cloud DBs |
| `PGPOOL_SIZE` | – | max client pool connections |

---

## 5 Wire Up Drizzle ORM

The connection lives in `server/db.ts`:

```ts
import { neon, postgres } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon";

// local / self-hosted
export const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client);
```

No change needed—just ensure `DATABASE_URL` is correct.

---

## 6 Run Migrations

Generate & push schema with **drizzle-kit**.

```bash
# 6.1 Install CLI (once per machine)
npm i -D drizzle-kit

# 6.2 Generate migration files from shared/schema.ts
npx drizzle-kit generate:pg

# 6.3 Apply to the DB
npm run db:push           # alias for "drizzle-kit push"
```

Success output:

```
✅  Applied 1 migration  (20240529110122_initial.sql)
```

---

## 7 Using a Cloud PostgreSQL Service

Skip local installs entirely.

| Provider | Free Tier | Quick Steps |
|----------|-----------|-------------|
| **Neon** | 10 GB, 500 K queries/day | ① Sign up ② Create project ③ Grab connection string |
| **Supabase** | 500 MB | ① New project ② Database settings |
| **Railway** | $5 credit | ① New project → Add PostgreSQL plugin |

### 7.1 Update `.env`

Example (Neon):

```
DATABASE_URL="postgresql://USER:PASSWORD@ep-red-flower-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

### 7.2 SSL

Most cloud URLs include `?sslmode=require`. If not, append it or set:

```
PGSSLMODE=require
```

### 7.3 Push Migrations

Run the same command—Drizzle handles SSL transparently:

```bash
npm run db:push
```

---

## 8 Next Steps

1. Start dev servers:

   ```bash
   npm run dev    # Vite + Express
   ```

2. Seed test data or use the UI to create records.
3. **Commit** the new migration files to version control.

You now have a fully-functional PostgreSQL backend—locally or in the cloud—ready for Outfitter development. Happy coding! 🦌🎣
