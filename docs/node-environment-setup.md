# 🛠 macOS Node.js Environment Setup with **NVM**

This guide shows how to prepare a **clean, reproducible Node.js tool-chain** on macOS for working on the **Outfitter** code-base.

> You’ll need an administrator account (default on most Macs).

---

## 1 Install NVM (Node Version Manager)

NVM lets you keep multiple Node versions side-by-side.

```bash
# 1.1 Download & run installer
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash

# 1.2 Load NVM immediately (skip re-opening the terminal)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

After a new terminal session the profile lines below will auto-source NVM:

```
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

Verify:

```bash
command -v nvm     # → nvm
```

---

## 2 Install Node.js & npm

Outfitter targets **Node 18** (works with 18 or 20).

```bash
# 2.1 Install Node 18 LTS
nvm install 18

# 2.2 Set it as your default
nvm alias default 18

# 2.3 Confirm
node -v            # v18.x.x
npm  -v            # 9.x  (bundled with Node)
```

Switch versions any time:

```bash
nvm install 20      # one-off
nvm use 20
```

---

## 3 Global npm Packages

Keep the global list minimal—only CLI tools you call from anywhere.

```bash
npm install -g pnpm yarn @antfu/ni npm-check-updates
```

| Package | Why |
|---------|-----|
| **pnpm / yarn** | alternative package managers for other projects |
| **ni / nr**    | run `npm`/`pnpm` scripts with one command |
| **npm-check-updates** | quickly bump outdated deps |

Tip Use **corepack** (`corepack enable`) to auto-install pnpm/yarn per-project.

---

## 4 Configure Outfitter Project

```bash
# 4.1 Clone
git clone https://github.com/cwilk3/Outfitter.git
cd Outfitter

# 4.2 Install workspace deps
npm install          # or pnpm install

# 4.3 Create env file
cp .env.example .env
# edit DATABASE_URL, JWT_SECRET, SESSION_SECRET …

# 4.4 Run DB migrations (PostgreSQL must be up)
npm run db:push

# 4.5 Start dev servers
npm run dev          # Vite (5173) + API (3000)
```

Global config tweaks (optional):

```bash
# Faster installs – skip docs & auditing in dev
npm config set fund false
npm config set audit false
```

---

## 5 Troubleshooting

| Symptom | Fix |
|---------|-----|
| `nvm: command not found` | Source NVM (`export NVM_DIR=… && . "$NVM_DIR/nvm.sh"`). |
| `node: No such file or directory` | `nvm install 18 && nvm use 18`. |
| Permissions errors in `/usr/local/` | `sudo chown -R $(whoami) /usr/local/*` (Homebrew legacy paths). |
| PostgreSQL connection refused | Make sure Postgres is running or use a cloud DB; double-check `DATABASE_URL`. |
| Port 3000/5173 already in use | `lsof -i :3000` then `kill <pid>` or change ports in `.env`. |
| `npm ERR! code UNABLE_TO_GET_ISSUER_CERT_LOCALLY` | Corporate proxy—set `npm config set strict-ssl false` or install root certs. |
| VS Code can’t find Node | Point to NVM default: Preferences → Settings → `terminal.integrated.env.*` add `NVM_DIR` & `PATH`. |

---

### Resetting Everything

```bash
# Remove current Node versions (keeps NVM):
nvm uninstall 18 20

# Re-install
nvm install 18
```

You’re now ready to develop, test and ship features for **Outfitter** with a healthy Node.js tool-chain. Happy coding!
