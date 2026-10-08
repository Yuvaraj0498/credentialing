# ZmartCredential — Provider Credentialing Platform

Full-stack conversion of the `credentialing 2.html` prototype (earlier version: `credentialing (6).html`).

```
Browser ──► Next.js admin (localhost:3000/admin) ──REST──► Spring Boot API (localhost:8080/api) ──JPA──► MySQL (XAMPP, db "credentialing")
```

| Folder | What |
|---|---|
| `admin/` | Next.js 16 (App Router, TypeScript, Tailwind v3) admin panel. All pages live under `/admin`. |
| `backend/` | Spring Boot 4.1 (Java 21, Spring Web, Data JPA/Hibernate, Security, Validation, Flyway). Layered: controller → service → repository → entity. |
| `database/` | `schema.sql` (tables + required reference data) and `seed.sql` (demo data) for manual setup. Flyway applies the same scripts automatically. |
| `docs/api/` | REST API reference per module (also live at http://localhost:8080/swagger-ui.html). |

### Project structure
```
admin/src/
  app/(dashboard)/<page>/page.tsx   signed-in pages (route group, URLs are /admin/<page>)
  app/signin, app/signup/{org,provider}, app/upload/[token]   public pages
  components/*.tsx                  shared UI (Avatar, Modal, PageHeader, Pill, Sidebar, StatCard, ...)
  components/modals/                every modal dialog
  components/widgets/               provider-page widgets (billing, follow-ups, time tracker)
  components/<feature>/             page views per feature (providers, billing, credentialing, ...)
  lib/                              api client, utils (formatting), export, hooks, constants, nav
  stores/                           app state providers (auth, toast, shell)
  types/                            API types (index.ts + one file per feature)
backend/src/main/java/com/zmartcredential/
  ZmartCredentialApplication.java
  common/ config/ controller/ dto/<module>/ entity/ exception/ repository/ security/ service/ util/
```

### Prototype v2 features
- **CAQH Config** (`/caqh-config`): "Import from CAQH" uses a built-in mock database (demo CAQH IDs 10000001–10000015) or a real CAQH API (`GET {apiUrl}/providers/{caqhId}`, key stored encrypted).
- **Import from CAQH** creates the provider with the documents CAQH reports as verified; a practice must be chosen.
- **Secure Links** (`/secure-links`) and the provider portal (`/upload/{token}`): PIN (5 attempts), profile, documents, review & submit.
- **Payer API Reference** (`/payer-api-reference`): submission method, API availability and notes per payer.
- Organization tree: select a client or practice to see its details and add practices / locations to it.
- Test Data: Sample / Export / Import JSON (import replaces the current test data; users are never exported).

## Prerequisites
- XAMPP with MySQL/MariaDB running on port 3306
- Java 21 (Temurin) — Maven is bundled via the wrapper (`mvnw`)
- Node.js 20+ (24 LTS tested)

## Run locally
1. **Start XAMPP → MySQL.**
2. **Create the database** (once). In phpMyAdmin or the MySQL shell:
   ```sql
   CREATE DATABASE credentialing CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
   Tables and data are created by Flyway on the first backend start (`db/migration` = schema + reference data, `db/demo` = demo records).
3. **Start the API**
   ```bash
   cd backend
   ./mvnw spring-boot:run        # Windows: mvnw.cmd spring-boot:run
   ```
   → http://localhost:8080/api, Swagger UI at http://localhost:8080/swagger-ui.html
4. **Start the admin panel**
   ```bash
   cd admin
   npm install
   npm run dev
   ```
   → http://localhost:3000/admin/signin

### Demo logins (from the seed data)
| Username | Password | Role |
|---|---|---|
| admin | admin123 | Org admin (Jake Zebaida) |
| clerk | clerk123 | Credentialing clerk |
| erizzo | rizzo123 | Provider (Erin Rizzo) — provider portal |
| platform.admin | test123 | Platform admin (all organizations) |
| org.admin.1 / clerk.1 / auditor / test.provider | test123 | Other roles |

## Configuration
Everything environment-specific is an environment variable with a local default.

**Backend** (`backend/src/main/resources/application.properties`)

| Variable | Default | Notes |
|---|---|---|
| `DB_NAME` | `credentialing` | Change the database name here (or set `DB_URL`). |
| `DB_URL` | `jdbc:mysql://localhost:3306/${DB_NAME}…` | Full JDBC URL override. |
| `DB_USERNAME` / `DB_PASSWORD` | `root` / *(empty)* | XAMPP defaults. |
| `FLYWAY_LOCATIONS` | `classpath:db/migration,classpath:db/demo` | Production: `classpath:db/migration` (no demo data). |
| `JWT_SECRET` | dev value | **Must** be set in production (any long random string). |
| `APP_ENCRYPTION_KEY` | dev value | AES key material for stored payer/CAQH passwords. **Set once in production and never change** (existing secrets become unreadable). |
| `JWT_ACCESS_MINUTES` / `JWT_REFRESH_DAYS` | 30 / 14 | Token lifetimes. |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated admin origins. |
| `COOKIE_SECURE` | `false` | `true` behind HTTPS. |
| `STORAGE_PATH` | `./uploads` | Uploaded documents. |
| `SERVER_PORT` | 8080 | |

**Admin** (`admin/.env.local`, see `.env.example`)

| Variable | Default |
|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080/api` |
| `NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS` | `true` locally, `false` in production |

## Security model
- Passwords: BCrypt. Login returns a 30-min JWT access token (kept in memory by the admin app) and sets a rotating refresh token as an **httpOnly, SameSite=Strict cookie** scoped to `/api/auth` (never readable by JavaScript).
- Multi-tenant: every query is scoped to the user's organization. `platform_admin` can work in any organization (org switcher in the sidebar → `X-Org-Id` header).
- Roles: `platform_admin`, `org_admin`, `clerk`, `provider`, `auditor`, enforced server-side by role checks and the editable **Permissions** matrix (`role_permission` table, per-org overrides).
- Provider users only reach their own provider record (portal pages).
- Payer portal / CAQH passwords are AES-256-GCM encrypted at rest and only returned by an audited "reveal" endpoint. The Credential Vault is zero-knowledge (encrypted in the browser with your passphrase; the server stores ciphertext only).
- Bean Validation on every request; one global error format `{status, error, message, fieldErrors, timestamp, path}`; no stack traces or SQL leak to clients.

## Deferred integrations (later phase)
The UI for these exists and data is stored, but the external call is not wired yet; endpoints return `{"integration":"deferred","message":…}` or queue records:
AI document classification and AI agents · live CAQH ProView / aggregator API sync · NPPES / OIG / SAM / state-board automatic checks (manual results can be recorded) · payer API submissions (queued) · Stripe card payments (invoices stay due; platform admin can mark paid) · SMTP/SMS delivery (emails are logged as `queued`) · background schedulers (reminder cadences, auto-sync, attestation rules can be run manually).

## Production deployment (desssnext.desss-portfolio.com)
```
Internet ─► Apache (TLS) ─┬─ /admin ─► Next.js  (pm2 "zmartcredential-admin",   port 3008)
                          └─ /api   ─► Spring Boot (pm2 "zmartcredential-backend", port 8085) ─► MySQL
```
Requirements on the server: Java 21, Node.js 20+, MySQL 8, pm2, Apache (vhost: `desssnext.desss-portfolio.com.conf`),
and Google Chrome (used by Payer Submissions to sign in to payer portals).

### 1. Clone
```bash
git clone https://github.com/Yuvaraj0498/credentialing.git
cd credentialing
```

### 2. Server settings (secrets — never committed)
```bash
cp backend/config/application.properties.example backend/config/application.properties
nano backend/config/application.properties     # DB user/password, JWT + encryption keys, SMTP login
```
If the server already ran this app, copy its existing `backend/config/application.properties` instead —
**keep the same `app.encryption-key`**, otherwise stored payer / CAQH passwords can no longer be read.
The admin build settings (`admin/.env.production`) are in the repo already.

### 3. Build
```bash
cd backend && chmod +x mvnw && ./mvnw -DskipTests package && cd ..
cd admin && npm ci && npm run build && cd ..
```

### 4. Start with pm2 (first time)
```bash
cd backend && pm2 start "java -jar target/credentialing-0.0.1-SNAPSHOT.jar" --name zmartcredential-backend && cd ..
cd admin && pm2 start npm --name zmartcredential-admin -- start && cd ..
pm2 save
```
The backend creates the database and all tables on its first start (Flyway). Open https://desssnext.desss-portfolio.com/admin

### 5. Update later
```bash
git pull
cd backend && ./mvnw -DskipTests package && pm2 restart zmartcredential-backend && cd ..
cd admin && npm ci && npm run build && pm2 restart zmartcredential-admin && cd ..
```

### Database scripts (`database/`)
- `schema.sql` — full schema + reference data (Flyway applies the same automatically).
- `restore_reference_data.sql` — puts back the built-in data (plans, permissions, payers, …) after tables were emptied.
- `clear_provider_data.sql` — removes all clients / practices / locations / providers and their data; keeps organizations, staff users and settings.
