# ShasanSeva — Project Context

> **Last updated**: 23 August 2026
> **Status**: Active development · Live in production
> **Organization**: Abhaya IT Solutions
> **Repo**: `Abhaya-IT-Solu/ShasanSeva` · default branch `master`

---

## How to maintain this document

This is a **living document**. It is the single place a newcomer (human or AI) should be able to read to understand the system without spelunking the codebase.

When you finish a piece of work, update:

1. **Current Status** — one paragraph, what is true *now*
2. **Changelog** (bottom) — one line, dated
3. Any section the change invalidates — schema, routes, env vars, deployment
4. **Known Issues & Traps** — add what bit you, remove what you fixed

Rules of thumb: prefer deleting stale content over letting it rot; record *why* alongside *what*; when something costs more than an hour to debug, it belongs in **Known Issues & Traps** so it costs nobody an hour again.

---

## Current Status

The platform is **live in production** and processing real orders. The core loop — browse scheme → upload documents → pay → admin fulfils → proof delivered — works end to end.

Recent work (August 2026) has been corrective rather than feature-driven. The notification feature, previously an orphaned backend with no UI and only two of six event types wired, is now complete and user-visible. A cluster of silent data-loss defects in the scheme editor was found and fixed. Underlying several of these was a single recurring cause: **configuration that degrades silently instead of failing loudly** — three separate production incidents (`PORTAL_URL`, `R2_PUBLIC_URL`, `R2_BUCKET_NAME`) traced back to secrets that were missing or empty, where the code helpfully substituted a default and carried on. That class of bug is now guarded at boot; see **Known Issues & Traps**.

Ahead of switching Razorpay to live keys, the payment path was audited and hardened. The most serious finding: `/verify` never checked that the payment being confirmed belonged to the order being settled, so a genuine cheap payment's signature could be replayed against an expensive order. That is closed, along with capture confirmation and an atomic settle. A read-only reconciliation endpoint now compares Razorpay's ledger against our orders — its first run surfaced two captured-but-unsettled orders. **Refunds remain unbuilt** despite a published refund policy; see Known Issues item 3.

**Planned before launch** (see `Capacity & Scaling` for the infrastructure half): admin-controlled scheme ordering; search and filters on the admin scheme and order lists; custom-form authoring moved from the developer portal into the admin panel; a `PENDING_PAYMENT` filter on the order queue; an `order_events` timeline so cancellation reasons survive resubmission and resubmissions are countable; user-authored notes on an order; a Gravincy credit in the footer; and an opening poster on the homepage driven by the existing CAROUSEL announcement.

### Recent commits

```text
47bf385  2026-08-23  fix(payments): bind payment to its order, verify capture, make PAID atomic
03758c1  2026-08-23  fix: remove silent R2 bucket fallback, warn on missing config at boot
ebec32c  2026-08-23  fix: scheme images returning null, plus three related data-loss defects
cdc8011  2026-08-22  feat: complete notification feature — fix IDOR, wire missing events, add web UI
57f52dc  2026-08-22  feat: add standalone Refund & Cancellation Policy page
7a3d25c  2026-06-23  Add portal secrets to deploy API workflow
89ddef5  2026-06-23  fix: correct Vercel build target for apps/portal
f1ebe7d  2026-06-23  Merge PR #2 — feature/custom-forms (developer portal)
```

81 commits total, effectively single-author (Nilesh Raju Ambekar). Work lands directly on `master` or via short-lived `feature/*` branches merged by PR. Pushes to `master` deploy automatically — see **Deployment**.

---

## Overview

ShasanSeva is a **Government Scheme Assistance Platform** connecting Indian citizens with government and private schemes (certificates, loans, jobs, licences, subsidies). Users browse schemes, fill scheme-specific application forms, upload required documents, pay a service fee via Razorpay, and receive managed assistance from human admins who do the actual government-facing legwork and return proof of completion.

**It is a paid assistance service, not a government body.** Approval is never guaranteed — the fee buys document handling and application support. This distinction is legally load-bearing and is stated in the footer disclaimer, Terms, FAQ, and the Refund Policy; keep those four consistent when editing any of them.

Bilingual throughout: **English** and **Marathi** (मराठी), with Marathi as the default locale.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                MONOREPO (pnpm workspaces + Turborepo)       │
│                                                             │
│  apps/web (Next.js 14)      apps/portal (Next.js 14)        │
│  :3000 — public + admin     :3002 — developer portal        │
│         │                          │                        │
│         └──────────┬───────────────┘                        │
│                    ▼                                        │
│            apps/api (Express) :3001                         │
│                    │                                        │
│         ┌──────────┴──────────┐                             │
│         │   packages/db       │  Drizzle ORM + schema       │
│         │   packages/types    │  Shared TS interfaces       │
│         └─────────────────────┘                             │
└─────────────────────────────────────────────────────────────┘

External services:
  ├── PostgreSQL (Supabase)   — primary datastore
  ├── Upstash Redis           — sessions, scheme cache, rate limiting
  ├── Cloudflare R2           — documents, images, receipts (S3 API)
  ├── Razorpay                — payments (INR)
  └── Firebase                — phone OTP + Google OAuth
```

**Three frontends, three audiences:**

| App | Port | Audience | Auth |
|-----|------|----------|------|
| `apps/web` `/[locale]/*` | 3000 | Citizens | User JWT (localStorage) |
| `apps/web` `/admin/*` | 3000 | Staff | Same JWT, `userType=ADMIN`, no i18n |
| `apps/portal` | 3002 | Developers | Separate portal JWT, env-configured bcrypt creds |

The admin panel lives inside `apps/web` (not a separate app) but is excluded from i18n and is English-only. The developer portal is genuinely separate because it authors `schemes.custom_fields`, which admins deliberately cannot touch.

### Directory layout

```
ShasanSeva/
├── apps/
│   ├── api/src/
│   │   ├── config/env.ts      # Zod-validated env  ⚠ see Known Issues
│   │   ├── lib/               # redis, utils/logger, firebase-admin
│   │   ├── middleware/        # auth, validation, rate limiting
│   │   ├── routes/            # 13 route modules
│   │   ├── services/          # auth, r2, razorpay, receipt, notification, portal, reconciliation
│   │   ├── app.ts             # express setup, CORS, Razorpay webhook (raw body)
│   │   └── index.ts           # entry, graceful shutdown, boot config checks
│   ├── web/
│   │   ├── messages/          # en.json, mr.json
│   │   └── src/{app,components,i18n,lib}
│   └── portal/
│       ├── vercel.json        # ⚠ required — see Deployment
│       └── src/{app,components,lib}
├── packages/
│   ├── db/{drizzle,src/schema}
│   └── types/src
├── scripts/db-backup.ps1
├── .github/workflows/deploy-api.yml
├── Dockerfile                 # multi-stage, node:20-alpine
└── project-context.md         # this file
```

**Package manager**: pnpm 9 · **Build**: Turborepo · **Container runtime**: Node 20 (Dockerfile); local dev on Node 22.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Next.js (App Router) | 14.2 |
| UI | React | 18.2 |
| Styling | CSS Modules + design tokens | — |
| i18n | next-intl | 4.8.2 |
| Backend | Express.js | 4.x |
| ORM | Drizzle ORM | 0.39 |
| Database | PostgreSQL (Supabase) | 15+ |
| Cache | Upstash Redis | — |
| Storage | Cloudflare R2 (S3 API) | — |
| Payments | Razorpay | — |
| Auth | JWT + Firebase | — |
| Validation | Zod | 3.x |
| PDF | PDFKit | — |
| Language | TypeScript | 5.3 |

No Tailwind — some JSX carries Tailwind-*looking* class names, but they resolve to utility classes hand-defined in `globals.css`. SWR is installed but unused; all fetching is `useEffect` + `api.request()`.

---

## Database Schema (12 tables)

### `users`
`id` uuid PK · `phone` varchar(15) UNIQUE · `email` UNIQUE nullable · `name` · `category` (STUDENT/FARMER/LOAN_CANDIDATE/OTHER) · `google_id` · `password_hash` bcrypt(10) · `address` jsonb · `saved_documents` jsonb · `profile_data` jsonb · `profile_complete` bool

> ⚠ **Schema drift**: the Drizzle schema declares `phone` nullable ("Nullable for OAuth users"), but the **live database still has it `NOT NULL`**. Migration `0012` contains the `DROP NOT NULL` but has not been applied. Google signups without a phone number fail until it is. See **Known Issues**.

### `admins`
`id` · `phone` UNIQUE · `email` UNIQUE · `name` · `role` (`ADMIN` / `SUPER_ADMIN`) · `is_active` · `created_by` FK→admins

### `admin_analytics`
One row per admin (UNIQUE `admin_id`). Orders handled/completed/cancelled/in-progress, documents verified/rejected, `avg_completion_time_hours`, `last_active_at`.

### `schemes`
`id` · `name` · `slug` UNIQUE · `description` · `category` (STUDENT/FARMER/LOAN/CERTIFICATE/JOBS/HEALTH/GOVT_CARD/LICENCE/TAX/OTHER) · `scheme_type` (GOVERNMENT/PRIVATE) · `eligibility` · `benefits` · `required_docs` jsonb · `custom_fields` jsonb · `service_fee` decimal · `average_completion_days` · `logo_url` · `reference_image_url` · `status` (ACTIVE/INACTIVE) · `created_by`
**Indexes**: category, status, scheme_type

> `logo_url` and `reference_image_url` store **R2 object keys, not URLs**. Read paths convert key→URL via `getPublicUrl()`. Never write a resolved URL into these columns.

### `scheme_translations`
`scheme_id` FK · `locale` (`en`/`mr`) · `name` · `description` · `eligibility` · `benefits` · `translated_by` — UNIQUE(`scheme_id`, `locale`)

### `orders`
`id` · `user_id` FK · `scheme_id` FK · `status` · `payment_id` · `razorpay_order_id` · `payment_amount` · `payment_timestamp` · `assigned_to` FK→admins · `admin_notes` · `receipt_key` · `application_form_data` jsonb
**Indexes**: user_id, status, created_at, assigned_to

```
PENDING_PAYMENT → PAID → IN_PROGRESS → PROOF_UPLOADED → COMPLETED
                            ↘ CANCELLED (any non-terminal stage)
```
Transitions are validated server-side in `PATCH /api/orders/:id/status`. Any admin may pick up a `PAID` order (which assigns it to them); only the assigned admin — or a `SUPER_ADMIN` — may advance it further.

### `documents`
`order_id` FK · `doc_type` · `file_url` / `file_key` · `status` (UPLOADED/VERIFIED/REJECTED/RESUBMISSION_REQUIRED) · `rejection_reason` · `verified_by`

### `proofs`
`order_id` FK · `file_url` / `file_key` · `proof_type` (RECEIPT/SCREENSHOT/REFERENCE_ID/CONFIRMATION/OTHER) · `uploaded_by`

### `notifications`
`recipient_id` · `recipient_type` (USER/ADMIN) · `type` · `title` · `message` · `related_order_id` FK · `read`
**Indexes**: (recipient_id, recipient_type, read), (recipient_id, recipient_type, created_at)
Types: `PAYMENT_SUCCESS`, `ORDER_STATUS_CHANGE`, `DOCUMENT_REJECTED`, `PROOF_UPLOADED`, `ORDER_COMPLETED`, `NEW_ORDER_ASSIGNED`.

> `NEW_ORDER_ASSIGNED` is defined but **deliberately never fired** — admins self-pick orders, so it would only notify an admin about their own click. Notifying *all* admins when a new paid order arrives is the sensible future use; it needs a fan-out over the `admins` table plus admin-side UI.

### `feedbacks`
1–5 star rating per completed order, UNIQUE `order_id`.

### `announcements`
Four types: `MARQUEE` (ticker), `PILL` (hero badges), `POPULAR_TAG` (search tags), `CAROUSEL` (with R2 image). Drives both web and the mobile app.

### `audit_logs`
Entity-based trail of admin actions — old/new values, performer, IP.

---

## API Routes

Mounted under `/api` — 13 modules: `auth`, `users`, `schemes`, `admin`, `documents`, `payments`, `orders`, `notifications`, `proofs`, `feedbacks`, `announcements`, `portal`, plus OAuth on `/auth/google`.

### Auth (`/api/auth/*`)
`POST /register` · `POST /login` · `POST /change-password` 🔒 · `POST /reset-password` (Firebase OTP) · `POST /logout` 🔒 · `GET /me` 🔒 · `GET /google` · `GET /google/callback`

### Schemes (`/api/schemes/*`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/schemes` | public | Filters + Redis cache. Admins additionally see INACTIVE. |
| GET | `/schemes/by-id/:id` | public | With translations; used by admin edit |
| GET | `/schemes/:slug` | public | Public detail, cached |
| POST | `/schemes` | Admin | `customFields` rejected |
| PATCH | `/schemes/:id` | Admin | `customFields` rejected; absent fields untouched |
| DELETE | `/schemes/:id` | Admin | Soft delete → INACTIVE |
| POST | `/schemes/:id/upload-image` | Admin | base64 → R2; returns `{ key, publicUrl }` |

> Admin visibility is resolved by `resolveOptionalAdmin()`, which **verifies the token and session**. It previously trusted the mere presence of an `Authorization` header, leaking INACTIVE schemes to anyone sending a garbage bearer token (fixed Aug 2026).

> `PATCH` uses partial-update semantics: a field absent from the body is left alone; a field explicitly `null` is nulled. Clients must send image fields **only** when deliberately changing them.

### Developer Portal (`/api/portal/*`)
Separate auth — portal JWT signed with `PORTAL_JWT_SECRET`, credentials from `PORTAL_USERS`. The **only** write path for custom forms.

`POST /portal/auth/login` (rate-limited) · `GET /portal/auth/me` · `GET /portal/schemes` · `GET /portal/schemes/:id` · `PATCH /portal/schemes/:id/custom-fields` (rejects duplicate field IDs, invalidates scheme cache)

### Orders (`/api/orders/*`)
`GET /orders` 🔒 · `GET /orders/:id` 🔒 · `GET /orders/:id/receipt` 🔒 · `PATCH /orders/:id/status` (Admin) · `POST /orders/:id/resubmit` 🔒 · `GET /orders/admin/queue` (Admin) · `POST /orders/:id/complete` (Admin) · `PATCH /orders/:id/notes` (Admin)

### Payments (`/api/payments/*`)
`POST /create-order` 🔒 · `POST /verify` 🔒 · `DELETE /cancel-order/:id` 🔒 · `POST /webhook` (public, HMAC-verified)

> The webhook is registered in `app.ts` **before** `express.json()` because signature verification needs the raw body. Do not move it below the JSON parser.

### Documents (`/api/documents/*`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/documents/upload` | 🔒 | **Preferred.** base64 → server → R2 |
| POST | `/documents/upload-url` | 🔒 | Legacy presigned URL |
| POST | `/documents/:id/confirm-upload` | 🔒 | Pairs with the legacy flow |
| GET | `/documents/:id/download-url` | 🔒 | Presigned, 15 min |
| PATCH | `/documents/:id/verify` | Admin | |
| PATCH | `/documents/:id/reject` | Admin | Notifies the user with the reason |
| GET | `/documents/order/:orderId` | Admin | |

> Web uses the **proxy** (`/documents/upload`). Direct browser→R2 PUTs need a CORS preflight that R2 rejects for non-simple content types; uploads failed silently and documents never linked to orders. Body limit is 15 MB to fit a 10 MB file base64-encoded (~13.3 MB). The presigned endpoints remain for the mobile app.

### Notifications (`/api/notifications/*`)
`GET /` 🔒 (paginated `?page=&limit=`; returns `{ notifications, unreadCount, pagination }`) · `PATCH /:id/read` 🔒 · `POST /mark-all-read` 🔒 · `GET /stream` 🔒 (SSE)

> The response keeps `{ notifications, unreadCount }` at the top level for mobile compatibility; `pagination` is purely additive. `PATCH /:id/read` **enforces ownership** and 404s on someone else's notification (was an IDOR). The SSE endpoint is unused by web — `EventSource` cannot send an `Authorization` header and the JWT lives in localStorage, so the bell polls every 60 s instead.

### Proofs, Admin, Other
`/api/proofs/*` — presigned upload, confirm (advances order), download
`/api/admin/*` — `stats`, `users`, `users/:id`, `my-analytics`; `admins` CRUD + `toggle-active` (SUPER_ADMIN)

**`GET /api/admin/reconciliation`** (SUPER_ADMIN) — compares Razorpay's ledger against `orders` and reports differences. `?days=N` (default 7, max 90) or `?from=ISO&to=ISO`.

| Discrepancy | Severity | Meaning |
|---|---|---|
| `CAPTURED_WITHOUT_ORDER` | critical | Money captured, no order references it |
| `CAPTURED_ORDER_NOT_SETTLED` | critical | Money captured, order still `PENDING_PAYMENT` — verify *and* webhook both missed |
| `SETTLED_WITHOUT_CAPTURE` | critical | Order treated as paid with no captured payment — fulfilling for free |
| `AMOUNT_MISMATCH` | critical | Captured amount ≠ recorded amount |
| `REFUNDED_BUT_ACTIVE` | warning | Refunded at Razorpay, order still active |

**Read-only by design.** Every discrepancy means money and fulfilment disagree, and the right response is a human decision — auto-repair would risk a second, wrong money movement. `truncated: true` in the response means the window held more than 5,000 payments and the result is incomplete; narrow the range.
`/api/feedbacks` · `/api/announcements/*` (+ `/public`) · `/api/health` (DB probe, used by the Docker healthcheck)

---

## Frontend Pages

### Public — `/{locale}/…`
`/` · `/schemes` · `/schemes/:slug` · `/track` · `/contact` · `/faq` · `/help` · `/privacy` · `/terms` · `/refund` · `/disclaimer`

### Auth
`/login` (phone+password, Google, forgot-password OTP) · `/auth/callback` · `/complete-profile`

### User (protected, `(user)` route group)
`/dashboard` · `/orders` · `/orders/:id` · `/notifications` · `/profile` · `/apply/:slug` (4-step wizard: Docs → Review → Payment → Success)

### Admin (protected, English only)
`/admin/dashboard` · `/admin/orders` · `/admin/orders/:id` · `/admin/schemes` · `/admin/schemes/new` · `/admin/schemes/:id/edit` · `/admin/users` · `/admin/admins` · `/admin/admins/new` · `/admin/announcements`

### Developer Portal (`apps/portal`)
`/login` · `/` (scheme list + field counts) · `/schemes/:id` (custom-fields builder)

---

## Authentication

```
Client: AuthProvider (React Context) → localStorage `auth_token` → useAuth()

Login paths:
  1. Phone + password  → POST /auth/login       → JWT
  2. Google OAuth      → Firebase → backend     → JWT
  3. Forgot password   → Firebase phone OTP     → reset → JWT

Session: JWT (7d) carries userId + userType; Redis holds the full session (7d TTL),
         enabling server-side invalidation on logout.

Guards:  user layout redirects anon → /login
         admin layout redirects non-admin → /dashboard
         API: authMiddleware (JWT + Redis session) → adminMiddleware / superAdminMiddleware
         Public-but-admin-aware routes: resolveOptionalAdmin()

Roles:   Public · USER · ADMIN · SUPER_ADMIN   (+ portal developers, separate realm)
```

---

## Payment Flow

```
Apply → upload documents → review
  → POST /payments/create-order       (Razorpay order, INR in paise)
  → Razorpay checkout modal
  → POST /payments/verify             (HMAC-SHA256 verification)
       ├─ status → PAID  (guarded: only from PENDING_PAYMENT)
       ├─ link uploaded documents to the order
       ├─ generate PDF receipt (PDFKit) → R2
       └─ PAYMENT_SUCCESS notification
  → success page + receipt download
```

`/verify` binds the submitted `razorpayOrderId` to the order's stored one before doing anything else — the signature alone proves only that Razorpay issued it for *some* order, not this one. It then confirms with Razorpay that the payment is `captured` and for the expected amount, and claims the `PENDING_PAYMENT` → `PAID` transition atomically so concurrent calls cannot double-run the side effects. On a Razorpay API error it fails closed with 503, which is safe because the webhook reaches PAID independently.

The `payment.captured` **webhook** races `/verify` — either may land first. Both guard on `PENDING_PAYMENT` and the webhook uses `.returning()` to detect whether *it* performed the transition, so exactly one `PAYMENT_SUCCESS` notification is created. `/verify` is idempotent: an already-`PAID` order returns success rather than erroring, so a user mashing "Retry Payment" cannot create duplicates.

---

## File Storage (Cloudflare R2)

**Key patterns** — the DB stores these keys, never full URLs:

```
users/{userId}/orders/{orderId}/{docType}_{ts}.{ext}    user documents
users/{userId}/documents/{docType}_{ts}.{ext}           saved documents
schemes/{schemeId}/logo_{ts}.{ext}                      scheme logos
schemes/{schemeId}/reference_{ts}.{ext}                 reference images
receipts/{orderId}/receipt.pdf                          payment receipts
proofs/{orderId}/{proofType}_{ts}.{ext}                 admin proofs
announcements/{announcementId}/{ts}.{ext}               carousel images
```

**Upload methods**

| Asset | Method | Why |
|---|---|---|
| User documents (web) | base64 → API → R2 | R2 rejects the CORS preflight for direct PUTs |
| User documents (mobile) | presigned URL | No browser CORS involved |
| Scheme / announcement images | base64 → API → R2 | Same CORS reason |
| Receipts | server-generated → R2 | Never touches a client |

**Reads**: private assets (documents, proofs, receipts) use 15-minute presigned URLs. Public assets (scheme logos, carousel images) resolve through `getPublicUrl()` against `R2_PUBLIC_URL`.

> ⚠ `getPublicUrl()` returns `null` when `R2_PUBLIC_URL` is unset — so a perfectly intact image reads as `null` and looks exactly like data loss. `R2_PUBLIC_URL` must point at the public dev URL **of the same bucket** as `R2_BUCKET_NAME`. See **Known Issues**.

---

## Caching & Rate Limiting

| Cache key | TTL | Invalidation |
|---|---|---|
| `cache:schemes:{locale}:{category}` | 30 min | any scheme write → `invalidateSchemeCache()` |
| `cache:scheme:{slug}:{locale}` | 1 hour | same |
| `session:{userId}` | 7 days | logout |
| `otp:{phone}` | 5 min | auto-expire |
| `rate:{key}` | 10 min | auto-expire |

Only non-admin, non-search requests are cached. After changing anything that alters *rendering* of cached data (including config like `R2_PUBLIC_URL`), stale entries persist up to the TTL — editing any scheme flushes them immediately.

| Limiter | Window | Max |
|---|---|---|
| Auth endpoints | 15 min | 10 |
| General API | 1 min | 100 |
| OTP | 10 min | 5 |

Redis-backed and **fails open** — if Redis is unreachable, requests pass rather than 500.

---

## Design System

**Font**: Public Sans · **Icons**: Material Icons / Symbols (CDN) · **Approach**: CSS Modules + tokens in `globals.css`

| Token | Value | Usage |
|---|---|---|
| Primary | `#1B5E20` | Government green — headers, CTAs |
| Secondary | `#FF9800` | Action orange — badges, highlights |
| Category colours | 10 values | Student `#00897B`, Farmer `#EF6C00`, Loan `#6A1B9A`, Certificate `#1E88E5`, … |

---

## Internationalization

next-intl 4.8.2 · locales `en` + `mr` · **default `mr`** · admin pages excluded · messages in `apps/web/messages/{en,mr}.json`.

Every user-facing string added to `apps/web` needs a key in **both** files — a missing `mr` key throws at render, not at build.

> Notification `title`/`message` are stored in the DB as **English only**. Marathi users see translated UI chrome around English notification text. Fixing this means rendering from `type` client-side rather than persisting prose.

---

## Environment Variables

### API (`apps/api`)

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres connection string |
| `JWT_SECRET` | ✅ | Min 32 chars. Falls back to `'dev-secret'` if unset — never acceptable in production |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | ✅ | Sessions, cache, rate limits |
| `R2_ACCOUNT_ID` | ✅ | R2 endpoint host |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | ✅ | Must have **Object Read & Write** on the bucket |
| `R2_BUCKET_NAME` | ✅ | **No default since Aug 2026** — uploads now throw rather than guess |
| `R2_PUBLIC_URL` | ✅ | Public dev URL of that same bucket. Without it every image URL is `null` |
| `GOOGLE_CLIENT_ID` / `_SECRET` / `_CALLBACK_URL` | ✅ | OAuth |
| `RAZORPAY_KEY_ID` / `_KEY_SECRET` | ✅ | Payments |
| `RAZORPAY_WEBHOOK_SECRET` | ✅ | Webhook HMAC verification |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | ✅ | Admin SDK — OTP + Google token verification |
| `WEB_URL` | ✅ | CORS origin. Defaults to `localhost:3000` |
| `API_URL` | ✅ | Defaults to `localhost:3001` |
| `PORTAL_URL` | ✅ | CORS origin for the portal. Defaults to `localhost:3002` |
| `PORTAL_USERS` | ✅ | `username:bcryptHash`, comma-separated |
| `PORTAL_JWT_SECRET` | ✅ | Separate from `JWT_SECRET` |
| `JWT_EXPIRES_IN` / `PORTAL_TOKEN_EXPIRES_IN` | ❌ | Default `7d` |
| `API_PORT` | ❌ | Default `3001` |
| `DATABASE_BACKUP_URL` | ❌ | Local only — IPv4 pooler URL for `pnpm db:backup` |

> Many of these are marked "required" here but are **optional in the Zod schema**, which is exactly how three production incidents happened. `apps/api/src/index.ts` now logs a named warning at boot for each missing R2 variable, and flags `WEB_URL`/`API_URL`/`PORTAL_URL` still pointing at localhost while `NODE_ENV=production`. Check the boot log after every deploy.

### Web (`apps/web`) / Portal (`apps/portal`)
`NEXT_PUBLIC_API_URL` · `NEXT_PUBLIC_FIREBASE_*` · `NEXT_PUBLIC_RAZORPAY_KEY_ID`

---

## Deployment

### API → AWS EC2 (Docker)

`.github/workflows/deploy-api.yml`, triggered by pushes to `master` touching `apps/api/**`, `packages/db/**`, `packages/types/**`, `Dockerfile`, `pnpm-lock.yaml`, or the workflow itself.

```
build multi-stage image → push to Docker Hub (:latest + :sha)
  → SSH to EC2
  → rewrite /home/ubuntu/shasansetu/.env from GitHub Secrets   ⚠
  → docker stop/rm, docker run (port 3001, 768 MB, healthcheck)
  → start autoheal sidecar (restarts unhealthy containers)
  → docker image prune
```

⚠ **The `.env` is fully regenerated from GitHub Secrets on every deploy.** Editing it on the box is pointless — the next deploy overwrites it. A secret that does not exist expands to an *empty string*, which is indistinguishable from correct in the GitHub UI. `FIREBASE_SERVICE_ACCOUNT_JSON` is written separately via `printf` because its quotes and newlines would break the heredoc.

Nginx sits in front (config in `docs/nginx-shasansetu-api.conf`); Docker healthcheck hits `/api/health`, which probes the DB.

**No migrations run on deploy.** Schema changes are applied manually — see below.

### Web + Portal → Vercel

Both deploy from `master`. `apps/portal/vercel.json` is **required**: Vercel's Turborepo auto-detection otherwise builds `@shasansetu/web` into `apps/portal/.next` and fails. Its explicit `buildCommand` overrides that.

### Post-deploy checklist

```bash
docker logs shasansetu-api | grep "Missing configuration" -A 5   # should be silent
docker exec shasansetu-api env | grep R2_                        # all non-empty
curl -s https://<api>/api/health
```

---

## Capacity & Scaling

Sizing for the expected launch load: **~10,000 daily active users, ~100 orders/day**.

### What that actually means

| | |
|---|---|
| Estimated requests | ~135–200K/day |
| Average | ~2 req/s (irrelevant) |
| Peak hour (~20% of daily) | **~8 req/s** |
| Minute-level bursts | **~25 req/s** |
| Current ceiling | ~100–150 req/s |

So peak load is roughly **20% of one instance**. **One EC2 instance is correct at launch** — a load balancer would add cost and complexity for a problem that doesn't exist yet.

### Bottleneck order

Capacity fails in this order, and note that **a load balancer only addresses #4**:

1. **DB connection pool, `max: 7`** ([client.ts:22](packages/db/src/client.ts)) — the hard ceiling. ~100–150 req/s sustained.
2. **Redis round trips** — the rate limiter runs `redis.incr` on *every* `/api` request; authed requests add a session `get`. Upstash is a **REST API**, so each is an HTTP call. If the Upstash region isn't co-located with EC2 this dominates latency before CPU ever does.
3. **Memory, 768MB** — the 15MB body limit means ~26MB transient per concurrent upload (base64 string + decoded Buffer). Roughly 5 simultaneous uploads is 130MB+. **This one bites at any traffic level**, and an OOM kill takes the container down.
4. **CPU** — single Node process, one core. Cluster mode fixes this long before a second machine is needed.

### Recommended config for launch

| Setting | Current | Target | Why |
|---|---|---|---|
| Instance | — | **t3.medium** (2 vCPU, 4GB) | ~$30/mo on-demand; t4g.medium is ~20% cheaper on ARM |
| DB pool | 7 | **20** | Covers bursts and slow queries |
| Container memory | 768MB | **2GB** | Concurrent uploads + PDFKit |
| Node process | single | **cluster, 2 workers** | Two vCPUs are available; use both |
| Rate limiter | all `/api` | skip cached public reads | Halves Redis traffic and latency |

### Scale-up thresholds

| Sustained peak | Action |
|---|---|
| < 50 req/s | Current setup with the changes above. No LB. |
| 50–200 req/s | Cluster mode, pool 20–30, Supabase **transaction pooler**, CDN for static |
| 200–1,000 req/s | 2–3 instances + ALB, multi-AZ |
| 1,000+ / spiky | Autoscaling group, edge caching, decouple the payment path |

### Things that will surprise you

- **Announcement spikes.** Government scheme platforms are exceptionally spiky — a scheme announcement or news mention can produce 10× for twenty minutes, faster than autoscaling reacts. The saving grace is that the spike is almost entirely *reads*, which the 30-minute Redis cache already absorbs. **Cloudflare in front of the public scheme endpoints** buys more headroom than a second instance would.
- **Notification polling inflates traffic.** The bell polls every 60s per logged-in tab. At ~2,900 logged-in users that is a meaningful share of total requests, each costing a Redis `incr` plus a DB query. Gate on `visibilitychange` or back off to 5 minutes.
- **Vercel function invocations.** Every page renders `ƒ (Dynamic) — server-rendered on demand`, so ~10K DAU × ~5 views ≈ **1.5M invocations/month**, likely past the Pro allowance. ISR or static generation for scheme pages would cut this sharply; the data is already cached API-side.
- **Upstash cost scales linearly** — ~$18/mo at 100K req/day, but **~$120–180/mo at 1M**. At that point a fixed plan or Redis on the EC2 box is dramatically cheaper and removes the HTTP round trips.

### Estimated monthly infrastructure

EC2 t3.medium + EBS ~$32 · Supabase Pro $25 · Upstash ~$18 · R2 ~$3 · Vercel Pro $20 · Firebase ~$10 · Sentry $0–26 · domain ~$2 → **~$110–135/mo (₹9,000–11,500)**. Razorpay adds ~2.36% of revenue, which at 100 orders/day is the largest single line item.

### Ready for horizontal scaling when needed

Verified: **no local disk writes** (receipts are generated in memory and streamed to R2), **no shared in-memory state** (the only `Map`/`Set` are request-scoped), sessions and rate limiting in Redis. The app is genuinely stateless, so scaling out is straightforward. Two caveats for that day: `max: 7` × N instances against Supabase's connection ceiling (use the transaction pooler), and any scheduled job — reconciliation especially — must run on **exactly one** instance or it will hammer Razorpay and duplicate alerts.

> **Before launch, regardless of scale:** fix the upload memory risk, raise the DB pool, get zero-downtime deploys (`docker stop`/`run` currently drops in-flight payments), and **add monitoring** — there is none today, no Sentry, no APM, no metrics. Load test with k6 or Artillery to replace these estimates with measurements.

---

## Database Operations & Backups

```bash
pnpm db:generate   # generate migration from schema diff
pnpm db:push       # apply schema directly  ← used in practice
pnpm db:studio     # Drizzle Studio
pnpm db:backup     # pg_dump → backups/ (gitignored, keeps newest 10)
```

**Connectivity**: `db.<ref>.supabase.co:5432` (the direct host) resolves **IPv6-only** and is unreachable from many networks including the current dev machine. Use the **session pooler** (`aws-1-<region>.pooler.supabase.com:5432`, user `postgres.<project-ref>`) for local tooling. `DATABASE_BACKUP_URL` holds this; `scripts/db-backup.ps1` prefers it.

**Migration state is drifted.** Past `db:push` usage means `db:migrate` fails replaying old migrations against the live DB ("column already exists"). Until reconciled, apply schema changes with `db:push` or hand-written SQL, and treat `packages/db/drizzle/*.sql` as a record of intent rather than a replayable history.

Backups are `pg_dump -Fc` (custom format). Restore:
```bash
pg_restore -d "<connection-url>" --clean --if-exists backups/<file>.dump
```
Dumps contain user PII — `backups/` is gitignored and must stay that way.

---

## Known Issues & Traps

### Open

1. **`users.phone` is still `NOT NULL` in production.** The schema says nullable and migration `0012` carries the `ALTER`, but it has not been applied. Google signups without a phone number fail. One statement fixes it:
   `ALTER TABLE public.users ALTER COLUMN phone DROP NOT NULL;`

2. **R2 bucket split.** Production spent months uploading to a different bucket than `R2_PUBLIC_URL` served, because `R2_BUCKET_NAME` was empty and the code silently defaulted to `shasansetu-documents`. ~36 DB-referenced objects live in the abandoned bucket and were consciously orphaned. Those rows still hold keys, so they render as **broken images** rather than empty slots — null the columns if that becomes annoying.

3. **Refunds are entirely manual and are not written back.** ⚠️ **Deliberate gap — not yet built.**

   There is **no refund code anywhere in the API** — no endpoint, no service, no webhook handler for `refund.processed`. But `/refund` publishes a policy promising refunds within stated windows, so this is a commitment the system cannot currently honour on its own.

   Today a refund means: an operator issues it manually in the Razorpay dashboard, money returns to the customer, and **nothing in our database changes**. The order still reads `PAID`/`IN_PROGRESS`, still sits in the admin queue, and still looks fulfillable. Nobody is told.

   The one guard rail: reconciliation flags these as `REFUNDED_BUT_ACTIVE`, so they are at least *discoverable* — run it after issuing any refund. That detects, it does not fix.

   To close this properly:
   - `POST /api/orders/:id/refund` (SUPER_ADMIN) calling Razorpay's refund API, writing a `REFUNDED` order status
   - A `refund.processed` webhook case, so dashboard-issued refunds sync back
   - A `REFUNDED` state in the order lifecycle and its status badges (currently the machine has no terminal refunded state — `CANCELLED` is the nearest and means something different)
   - A refund notification type, and a decision on whether refunds are ever partial

4. **Migration history is not replayable** (above).

5. **Notification text is English-only** in the DB.

6. **Auth guards are client-side.** No server-side middleware enforcement beyond i18n routing; the API is the real boundary.

### Lessons that cost real time

**Config that degrades silently is the recurring villain.** Three incidents, one shape: a secret is missing or empty, the code substitutes a plausible default, everything "works", and the damage surfaces weeks later somewhere unrelated.

- `PORTAL_URL` missing → CORS defaulted to `localhost:3002` → portal login failed with no server-side log
- `R2_PUBLIC_URL` missing → every image URL `null` → looked exactly like data loss
- `R2_BUCKET_NAME` empty → uploads went to a phantom bucket → "object not found" months later

Guard rails now in place: boot-time warnings naming each missing variable, `requireBucket()` throwing instead of guessing, and a production check for localhost URLs. **When adding config, prefer a loud failure over a helpful default** — and remember that a workflow line referencing a nonexistent secret writes an empty string, not nothing.

**Other traps worth knowing:**

- **A GitHub secret that "looks set" may be empty.** The UI cannot show you. Re-enter it to rule it out.
- **R2 API tokens are bucket-scoped.** Repointing `R2_BUCKET_NAME` without updating the credentials yields `AccessDenied` — a valid token hitting a bucket outside its scope. Change the bucket and the keys together.
- **Read-only R2 tokens pass every read check** and only fail at upload, which looks identical to a scoping problem. Verify with an actual write.
- **`PATCH /api/schemes/:id` is a partial update.** Sending `logoUrl: null` to "clear the preview" writes NULL immediately. Stage removals in local state and apply on save.
- **Drizzle returns camelCase properties.** `scheme.average_completion_days` is `undefined`, silently drops from the response, and round-trips back as `NULL` — wiping the column on every save. Watch for snake_case property reads.
- **`packages/db` is consumed from `dist/`.** Rebuild it after schema edits or the API won't see them in dev.
- **Turbo caches builds by env var.** `NEXT_PUBLIC_API_URL` is in `turbo.json`'s build env so a changed API URL invalidates the cache.

---

## Migration History

| # | Name | Change |
|---|---|---|
| 0000 | tearful_blue_marvel | Initial schema — 10 core tables |
| 0001 | worried_hellcat | `documents.file_url`, `proofs.file_url` → text |
| 0002 | warm_network | `orders.receipt_key` |
| 0003 | even_human_torch | 14 indexes |
| 0004 | mixed_skrulls | `feedbacks` table |
| 0005 | noisy_silvermane | `announcements` table |
| 0006 | add_carousel_fields | Carousel support |
| 0007 | stiff_corsair | `announcements`: description, image_key, image_url, scheme_id |
| 0008 | ambitious_shinko_yamashiro | `schemes.average_completion_days` |
| 0009 | add_scheme_images | (superseded by 0010) |
| 0010 | striped_banshee | `schemes.logo_url`, `reference_image_url` |
| 0011 | lazy_red_shift | `users.profile_data`, `schemes.custom_fields`, `orders.application_form_data` |
| 0012 | rich_omega_sentinel | Notification indexes ✅ applied · `users.phone` DROP NOT NULL ❌ **not applied** |

---

## Key Architectural Decisions

1. **Monorepo with shared packages** — schema and types shared across API and both frontends, so a column rename surfaces as a type error rather than a runtime bug.
2. **Server-side upload proxy** — browser uploads go base64 → API → R2, because R2 rejects the CORS preflight for non-simple content types. Mobile keeps presigned URLs.
3. **Keys in the DB, URLs at read time** — storage columns hold R2 keys; URLs are derived per-request, so the CDN domain can change without a migration. The cost is that a missing `R2_PUBLIC_URL` makes intact data look lost.
4. **Redis-backed sessions** — JWTs stay minimal; Redis holds the session, enabling true server-side logout.
5. **Dedicated translations table** — locale-filtered JOINs rather than JSON blobs.
6. **Soft-deleted schemes** — INACTIVE, never removed, preserving referential integrity with historical orders.
7. **Rate limiting fails open** — a Redis outage must not lock out real users.
8. **Custom forms owned by a separate portal** — `schemes.custom_fields` is writable only through `/api/portal/*`; admin endpoints reject `customFields` and leave the column untouched, so admin edits cannot clobber developer-authored forms.
9. **Idempotent payment confirmation** — `/verify` and the webhook both guard on `PENDING_PAYMENT`; whichever wins performs the transition exactly once.
10. **Polling over SSE for notifications** — `EventSource` cannot carry an `Authorization` header and the JWT is in localStorage; a 60 s poll avoids putting tokens in query strings.

---

## Development Commands

```bash
pnpm install
pnpm run dev        # web :3000 · api :3001 · portal :3002
pnpm run build
pnpm run lint

pnpm --filter @shasansetu/api dev
pnpm --filter web build
pnpm --filter @shasansetu/db build     # required after schema edits

pnpm db:push
pnpm db:studio
pnpm db:backup
```

---

## Changelog

| Date | Change |
|---|---|
| 2026-08-24 | Documented capacity and scaling for the expected launch load (10K DAU / 100 orders): one EC2 is correct, bottleneck order, config targets, and the thresholds at which a load balancer becomes the right answer |
| 2026-08-23 | Added payment reconciliation (`GET /api/admin/reconciliation`) — read-only comparison of Razorpay's ledger against `orders`. First run flagged 2 captured-but-unsettled orders |
| 2026-08-23 | Hardened `/payments/verify`: bound payment to its order (was replayable across orders), added capture + amount confirmation, made the PAID transition atomic, unique index on `payment_id` |
| 2026-08-23 | Removed silent R2 bucket fallback; boot-time config warnings. Discovered production had been uploading to a phantom bucket; orphaned those objects by decision |
| 2026-08-23 | Fixed scheme images reading `null` (missing `R2_PUBLIC_URL`), the ✕-button image clobber, `averageCompletionDays` wipe, and an INACTIVE-scheme auth leak |
| 2026-08-22 | Notification feature completed — IDOR fixed, four dead event types wired, bell + `/notifications` page, indexes added |
| 2026-08-22 | Standalone Refund & Cancellation Policy page (`/refund`) |
| 2026-08-22 | Added `pnpm db:backup` (local `pg_dump` into gitignored `backups/`) |
| 2026-06-23 | Portal secrets added to deploy workflow; `apps/portal/vercel.json` to fix Vercel's build target |
| 2026-06-23 | Developer portal for custom forms; document-upload CORS fix |
| 2026-06-19 | Custom application forms; Razorpay flow fixes |
| 2026-05-06 | Scheme logo + reference images; image uploads proxied through the backend |
