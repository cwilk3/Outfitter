# 📚 Outfitter Documentation Index

Welcome to the Outfitter knowledge-base.  
Use this page as a **map** to quickly jump to any topic.

---

## 🏁 Getting Started

| Doc | Summary |
|-----|---------|
| [GETTING_STARTED.md](../GETTING_STARTED.md) | Step-by-step local setup, project tour and core concepts. |
| [QUICK_START_GUIDE.md](../QUICK_START_GUIDE.md) | 30-minute crash-course covering auth flow, DB schema, API tests & priority tasks. |

---

## 🏗️ Architecture

| Doc | Summary |
|-----|---------|
| [database_diagram.md](../database_diagram.md) | ER diagram (Mermaid) with narrative explanation of multi-tenant relationships. |
| [docs/database_schema.md](database_schema.md) | Textual reference of every table, constraint, index & best-practices. |
| [database_schema.mmd](../database_schema.mmd) | Raw Mermaid source of the ER diagram for embedding/regeneration. |

---

## 💻 Development

| Doc / Tool | Summary |
|------------|---------|
| [docs/development-guide.md](development-guide.md) | Full-stack overview, code layout, daily workflow, common tasks. |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | Coding standards, branching strategy, PR workflow, testing & security requirements. |
| [docs/feature-implementation-guide.md](feature-implementation-guide.md) | Example walk-through adding a complete feature (“Guide Notes”)—follow this template for new work. |

---

## ⚙️ Environment & Tooling

| Doc / Script | Summary |
|--------------|---------|
| [setup-dev-environment.sh](../setup-dev-environment.sh) | Bash script — verifies prerequisites, installs deps, migrates DB, boots dev servers. |
| [docs/node-environment-setup.md](node-environment-setup.md) | Installing Node.js via NVM, managing versions, global tooling. |
| [docs/postgres-setup.md](postgres-setup.md) | Local & cloud PostgreSQL installation, DB creation, Drizzle migrations. |

---

## 🗄️ Database

| Doc | Summary |
|-----|---------|
| [docs/database_schema.md](database_schema.md) | Canonical schema reference (tables, enums, relationships). |
| [docs/postgres-setup.md](postgres-setup.md) | Installation & migration guide for PostgreSQL. |

---

## 🐞 Debugging & Testing

| Doc / Script | Summary |
|--------------|---------|
| [docs/debugging-guide.md](debugging-guide.md) | Field manual for troubleshooting auth, multi-tenant leaks, DB, API & React issues. |
| [test-api.sh](../test-api.sh) | Automated smoke-test script: registers user, logs in, CRUD checks, tenant isolation. |

---

## 🔐 Security

| Doc | Summary |
|-----|---------|
| [CONTRIBUTING.md](../CONTRIBUTING.md#6-security-considerations) | Security section covers data isolation, secrets, rate-limiting & dependency audits. |
| [docs/debugging-guide.md](debugging-guide.md#7-security-auditing) | How to run security audits (npm audit, git-secrets, OWASP ZAP). |

---

### 📎 Related Assets

* `attached_assets/` – Product requirements PDFs, flow screenshots & design notes.
* `docs/architecture/` – Additional diagrams & historical ERDs.
* `docs/api/` – *(future)* endpoint-level reference.

---

Happy hacking & tight lines!  
— The Outfitter Core Team
