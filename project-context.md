# ShasanSeva — Project Context

> **Last updated**: June 2026
> **Status**: Active development · Pre-production
> **Organization**: Abhaya IT Solutions

---

## Current Status & Recent Updates

**Current Status**: We have recently completed the "Custom Application Forms" feature (users fill scheme-specific fields during application). **Custom-form authoring has now been moved out of the admin panel into a dedicated, standalone Developer Portal (`apps/portal`)** — regular admins no longer create/edit custom fields; they continue to manage everything else about a scheme (name, fee, docs, images, translations, status). Developers manage custom fields through the portal, which authenticates against env-configured bcrypt credentials and writes via `/api/portal/*`. We also fixed several critical bugs in the Razorpay payment flow (including webhook signature verification and idempotency) and resolved an issue with Google OAuth crashing for subsequent users due to a database unique constraint on empty phone numbers. Frontend TypeScript errors are fully resolved.

### Last 3 Commits
```text
commit 9497ece0ed92f633aebca1b0e1de96469b08d23b
Author: Nilesh Raju Ambekar <nileshambekar9281@gmail.com>
Date:   Fri Jun 19 19:48:42 2026 +0530

    fix: resolve frontend typescript errors

commit 75f3d6ddec3ab7c1b14e7a2671bf01df36ca717d
Author: Nilesh Raju Ambekar <nileshambekar9281@gmail.com>
Date:   Fri Jun 19 12:57:34 2026 +0530

    feat: custom application forms and razorpay payment flow fixes

commit 60f683f597c91da94f4cd48ee133c41a5138ea36
Author: Nilesh Raju Ambekar <nileshambekar9281@gmail.com>
Date:   Wed May 6 16:38:03 2026 +0530

    fix: proxy image uploads through backend to bypass R2 CORS
```

---

## Overview

ShasanSeva is a **Government Scheme Assistance Platform** that connects Indian citizens with government and private schemes (certificates, loans, jobs, licenses, etc.). Users browse schemes, upload required documents, pay a service fee via Razorpay, and receive managed assistance through an admin-operated backend. The platform supports **English** and **Marathi** (मराठी) localization.

---

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                     MONOREPO (pnpm + Turborepo)            │
│                                                            │
│  ┌──────────────┐    ┌──────────────┐                      │
│  │  apps/web     │    │  apps/api     │                      │
│  │  Next.js 14   │───►│  Express.js   │                      │
│  │  Port 3000    │    │  Port 3001    │                      │
│  └──────┬───────┘    └──────┬───────┘                      │
│         │                   │                              │
│  ┌──────┴───────────────────┴───────────┐                  │
│  │           packages/db                 │                  │
│  │        Drizzle ORM + Schema           │                  │
│  └──────────────┬────────────────────────┘                  │
│  ┌──────────────┴────────────────────────┐                  │
│  │          packages/types               │                  │
│  │     Shared TypeScript interfaces      │                  │
│  └───────────────────────────────────────┘                  │
└────────────────────────────────────────────────────────────┘

External Services:
  ├── PostgreSQL (Supabase)          — Primary database
  ├── Upstash Redis                  — Sessions, caching, rate limiting
  ├── Cloudflare R2                  — Document & image storage (S3-compatible)
  ├── Razorpay                       — Payment gateway (INR)
  ├── Firebase                       — Phone OTP + Google OAuth
  └── Google OAuth                   — Social login
```

### Monorepo Structure

```
ShasanSeva/
├── apps/
│   ├── api/                    # @shasansetu/api — Express REST API
│   │   └── src/
│   │       ├── config/         # Environment validation (Zod)
│   │       ├── lib/            # Redis, utils, Firebase Admin
│   │       ├── middleware/     # Auth, validation, rate limiting
│   │       ├── routes/         # All API route handlers
│   │       ├── services/       # Business logic (auth, r2, razorpay, receipt, notifications)
│   │       ├── app.ts          # Express app setup
│   │       └── index.ts        # Server entry point
│   ├── web/                    # @shasansetu/web — Next.js 14 frontend
│   │   ├── messages/           # en.json, mr.json (i18n)
│   │   ├── public/             # Static assets (logos, category GIFs)
│   │   └── src/
│   │       ├── app/            # App Router pages
│   │       ├── components/     # Shared + admin components
│   │       ├── i18n/           # next-intl config
│   │       ├── images/         # Imported assets
│   │       └── lib/            # API client, auth context, Firebase client
│   └── portal/                 # @shasansetu/portal — Next.js 14 Developer Portal (port 3002)
│       └── src/                # Custom-forms management (login, scheme list, field builder)
│           ├── app/            # login, schemes list (/), schemes/[id] builder
│           ├── components/     # PortalHeader
│           └── lib/            # Portal API client + portal auth context
├── packages/
│   ├── db/                     # @shasansetu/db — Drizzle ORM
│   │   ├── drizzle/            # SQL migrations (0000–0010)
│   │   └── src/schema/         # Table definitions
│   └── types/                  # @shasansetu/types — Shared interfaces
├── pnpm-workspace.yaml
├── turbo.json
├── Dockerfile                  # Multi-stage production build
└── .env                        # Environment variables
```

**Package Manager**: pnpm 9.0  
**Build System**: Turborepo  
**Runtime**: Node.js 22 (LTS)

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | Next.js (App Router) | 14.2 |
| **UI** | React | 18.2 |
| **Styling** | CSS Modules + Custom Design System | — |
| **i18n** | next-intl | 4.8.2 |
| **Backend** | Express.js | 4.x |
| **ORM** | Drizzle ORM | 0.39 |
| **Database** | PostgreSQL (Supabase) | 15+ |
| **Cache** | Upstash Redis | — |
| **Storage** | Cloudflare R2 (S3 API) | — |
| **Payments** | Razorpay | — |
| **Auth** | JWT + Firebase (OTP/OAuth) | — |
| **Validation** | Zod | 3.23 |
| **PDF** | PDFKit | — |
| **Language** | TypeScript | 5.3 |

---

## Database Schema (13 Tables)

### Core Tables

#### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| phone | varchar(15) | UNIQUE, NOT NULL — Indian format `^[6-9]\d{9}$` |
| email | varchar(255) | UNIQUE, nullable |
| name | varchar(255) | |
| category | varchar(50) | STUDENT / FARMER / LOAN_CANDIDATE / OTHER |
| google_id | varchar(255) | OAuth link |
| password_hash | varchar(255) | bcrypt (10 rounds) |
| address | jsonb | `{line1, line2, city, state, pincode}` |
| saved_documents | jsonb | `[{type, label, fileUrl, fileKey, uploadedAt}]` |
| profile_complete | boolean | default false |
| created_at / updated_at | timestamp | |

#### `admins`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| phone | varchar(15) | UNIQUE |
| email | varchar(255) | UNIQUE |
| name | varchar(255) | NOT NULL |
| role | varchar(20) | `ADMIN` / `SUPER_ADMIN` |
| is_active | boolean | default true |
| created_by | uuid | FK → admins(id) |

#### `admin_analytics`
Tracks per-admin performance: total_orders_handled, orders_completed, orders_cancelled, orders_in_progress, documents_verified, documents_rejected, avg_completion_time_hours, last_active_at. One row per admin (UNIQUE admin_id).

---

### Scheme Tables

#### `schemes`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| name | varchar(255) | Legacy English name |
| slug | varchar(255) | UNIQUE, URL-friendly |
| description | text | Legacy English |
| category | varchar(50) | STUDENT / FARMER / LOAN / CERTIFICATE / JOBS / HEALTH / GOVT_CARD / LICENCE / TAX / OTHER |
| scheme_type | varchar(50) | GOVERNMENT / PRIVATE |
| eligibility | text | |
| benefits | text | |
| required_docs | jsonb | `[{type, label, label_mr, required, description, description_mr}]` |
| custom_fields | jsonb | `[{id, type, label, label_mr, required, options, placeholder, validationRegex}]` |
| service_fee | decimal(10,2) | NOT NULL |
| average_completion_days | decimal(5,0) | |
| logo_url | text | R2 key (nullable) |
| reference_image_url | text | R2 key (nullable) |
| status | varchar(20) | ACTIVE / INACTIVE |
| created_by | uuid | FK → admins(id) |
| **Indexes** | | category, status, scheme_type |

#### `scheme_translations`
| Column | Type | Notes |
|--------|------|-------|
| scheme_id | uuid | FK → schemes(id) |
| locale | varchar(5) | `en` or `mr` |
| name | varchar(255) | Translated scheme name |
| description / eligibility / benefits | text | |
| translated_by | uuid | FK → admins(id) |
| **Indexes** | | UNIQUE(scheme_id, locale) |

---

### Order & Payment Tables

#### `orders`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → users(id) |
| scheme_id | uuid | FK → schemes(id) |
| status | varchar(30) | See lifecycle below |
| payment_id | varchar(255) | Razorpay payment ID |
| razorpay_order_id | varchar(255) | |
| payment_amount | decimal(10,2) | |
| payment_timestamp | timestamp | |
| assigned_to | uuid | FK → admins(id) |
| admin_notes | text | |
| receipt_key | varchar(500) | R2 key for PDF receipt |
| application_form_data | jsonb | Key-value mapping for scheme's custom fields |
| **Indexes** | | user_id, status, created_at, assigned_to |

**Order Lifecycle**:
```
PENDING_PAYMENT → PAID → IN_PROGRESS → PROOF_UPLOADED → COMPLETED
                                    ↘ CANCELLED (at any non-terminal stage)
```

#### `documents` — User-uploaded application documents
| Column | Type | Notes |
|--------|------|-------|
| order_id | uuid | FK → orders(id) |
| doc_type | varchar(100) | e.g., "AADHAAR_CARD", "PAN_CARD" |
| file_url / file_key | text | R2 paths |
| status | varchar(30) | UPLOADED / VERIFIED / REJECTED / RESUBMISSION_REQUIRED |
| rejection_reason | text | |
| verified_by | uuid | FK → admins(id) |

#### `proofs` — Admin-uploaded completion proofs
| Column | Type | Notes |
|--------|------|-------|
| order_id | uuid | FK → orders(id) |
| file_url / file_key | text | R2 paths |
| proof_type | varchar(100) | RECEIPT / SCREENSHOT / REFERENCE_ID / CONFIRMATION / OTHER |
| uploaded_by | uuid | FK → admins(id) |

---

### Supporting Tables

#### `notifications`
In-app notifications with SSE streaming. Types: PAYMENT_SUCCESS, ORDER_STATUS_CHANGE, DOCUMENT_REJECTED, PROOF_UPLOADED, ORDER_COMPLETED, NEW_ORDER_ASSIGNED.

#### `feedbacks`
1-5 star rating per completed order (UNIQUE order_id constraint).

#### `announcements`
4 types: MARQUEE (scrolling ticker), PILL (hero badges), POPULAR_TAG (search tags), CAROUSEL (with R2 image).

#### `audit_logs`
Entity-based audit trail for all admin actions. Tracks old/new values, performer, IP address.

---

## API Routes (54+ endpoints)

### Authentication (`/api/auth/*`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | — | Phone + password registration |
| POST | `/auth/login` | — | Login (users & admins) |
| POST | `/auth/change-password` | ✅ | Change password |
| POST | `/auth/reset-password` | — | Firebase OTP-based reset |
| POST | `/auth/logout` | ✅ | Invalidate Redis session |
| GET | `/auth/me` | ✅ | Current user profile |
| GET | `/auth/google` | — | Google OAuth redirect |
| GET | `/auth/google/callback` | — | OAuth callback handler |

### Schemes (`/api/schemes/*`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/schemes` | — | List with filters (category, type, search, locale). Redis cached. |
| GET | `/schemes/by-id/:id` | — | By UUID with translations (admin edit) |
| GET | `/schemes/:slug` | — | By slug (public detail). Redis cached. |
| POST | `/schemes` | Admin | Create with translations (custom fields NOT accepted here) |
| PATCH | `/schemes/:id` | Admin | Update (custom fields NOT accepted here) |
| DELETE | `/schemes/:id` | Admin | Soft delete (→ INACTIVE) |
| POST | `/schemes/:id/upload-image` | Admin | Upload logo/reference as base64 → R2 |

> **Note:** `schemes.custom_fields` is no longer writable through the admin scheme endpoints. The admin create/update Zod schemas reject `customFields`, and on update the column is left untouched (so portal-managed fields are preserved). Custom fields are managed exclusively through the Developer Portal endpoints below.

### Developer Portal (`/api/portal/*`)
Separate auth from users/admins — portal JWT signed with `PORTAL_JWT_SECRET`, credentials from env (`PORTAL_USERS`). This is the **only** write path for custom forms.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/portal/auth/login` | — | Login with env-configured dev username/password (bcrypt). Returns portal JWT. Rate-limited. |
| GET | `/portal/auth/me` | Portal | Verify token, return `{ username }` |
| GET | `/portal/schemes` | Portal | List all schemes (incl. INACTIVE) with custom-field counts |
| GET | `/portal/schemes/:id` | Portal | Scheme + its current custom fields |
| PATCH | `/portal/schemes/:id/custom-fields` | Portal | Replace a scheme's custom fields (rejects duplicate IDs); invalidates scheme cache |

### Orders (`/api/orders/*`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/orders` | User | User's orders (paginated) |
| GET | `/orders/:id` | User | Order detail with documents |
| GET | `/orders/:id/receipt` | User | Signed download URL for receipt PDF |
| PATCH | `/orders/:id/status` | Admin | Update status (with assignment rules) |
| POST | `/orders/:id/resubmit` | User | Resubmit cancelled order |
| GET | `/orders/admin/queue` | Admin | Admin order queue (filterable) |
| POST | `/orders/:id/complete` | Admin | Mark completed + notify user |
| PATCH | `/orders/:id/notes` | Admin | Save admin notes |

### Payments (`/api/payments/*`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/payments/create-order` | User | Create Razorpay order |
| POST | `/payments/verify` | User | Verify payment → PAID + generate receipt |
| DELETE | `/payments/cancel-order/:id` | User | Cancel pending payment |
| POST | `/payments/webhook` | — | Razorpay webhook handler |

### Documents (`/api/documents/*`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/documents/upload-url` | User | Presigned R2 upload URL |
| POST | `/documents/:id/confirm-upload` | User | Confirm upload |
| GET | `/documents/:id/download-url` | ✅ | Presigned download URL |
| PATCH | `/documents/:id/verify` | Admin | Verify document |
| PATCH | `/documents/:id/reject` | Admin | Reject with reason |
| GET | `/documents/order/:orderId` | Admin | All docs for an order |

### Proofs (`/api/proofs/*`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/proofs/upload-url` | Admin | Presigned R2 upload URL |
| POST | `/proofs/:id/confirm` | Admin | Confirm + update order status |
| GET | `/proofs/order/:orderId` | ✅ | Get proofs for order |
| GET | `/proofs/:id/download-url` | ✅ | Download proof |

### Admin (`/api/admin/*`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/stats` | Admin | Dashboard stats |
| GET | `/admin/users` | Admin | List all users |
| GET | `/admin/users/:id` | Admin | User details |
| GET | `/admin/my-analytics` | Admin | Current admin analytics |
| GET | `/admin/admins` | Super | List all admins |
| POST | `/admin/admins` | Super | Create admin |
| PATCH | `/admin/admins/:id` | Super | Update admin |
| PATCH | `/admin/admins/:id/toggle-active` | Super | Toggle active |

### Other
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/notifications` | ✅ | Get notifications + unread count |
| GET | `/notifications/stream` | ✅ | SSE stream (10s polling) |
| POST/PATCH | `/notifications/*` | ✅ | Mark read |
| POST | `/feedbacks` | User | Submit rating (1-5) |
| GET/POST/PATCH/DELETE | `/announcements/*` | Admin | Manage announcements |
| GET | `/announcements/public` | — | Public announcements by type |
| GET | `/health` | — | DB health check |

---

## Frontend Pages

### Public Pages
| Route | Description |
|-------|-------------|
| `/{locale}` | Homepage — hero, search, 10-category grid, mobile app showcase |
| `/{locale}/schemes` | Browse/search schemes with category filters |
| `/{locale}/schemes/:slug` | Scheme detail — eligibility, benefits, docs, logo, reference image |
| `/{locale}/track` | Track application by order ID |
| `/{locale}/contact` | Contact page |
| `/{locale}/faq` | FAQ |
| `/{locale}/help` | Help center |
| `/{locale}/privacy` | Privacy policy |
| `/{locale}/terms` | Terms of service |
| `/{locale}/disclaimer` | Disclaimer |

### Auth Pages
| Route | Description |
|-------|-------------|
| `/{locale}/login` | Login/Register (phone+password, Google, forgot password with OTP) |
| `/{locale}/auth/callback` | OAuth callback handler |
| `/{locale}/complete-profile` | Post-registration profile completion |

### User Pages (Protected)
| Route | Description |
|-------|-------------|
| `/{locale}/dashboard` | Greeting, quick actions, recent applications |
| `/{locale}/orders` | All applications with status badges |
| `/{locale}/orders/:id` | Order detail — status, payment, documents, resubmit |
| `/{locale}/profile` | View/edit profile, change password |
| `/{locale}/apply/:slug` | 4-step apply wizard (Docs → Review → Payment → Success) |

### Admin Pages (Protected, no i18n)
| Route | Description |
|-------|-------------|
| `/admin/dashboard` | Stats, recent orders, quick actions |
| `/admin/orders` | Order queue with status tabs, actions |
| `/admin/orders/:id` | Full order management (41KB) |
| `/admin/schemes` | Scheme list |
| `/admin/schemes/new` | Create scheme with image upload (no custom-fields builder) |
| `/admin/schemes/:id/edit` | Edit scheme with image upload (no custom-fields builder) |
| `/admin/users` | User management |
| `/admin/admins` | Admin management (SUPER_ADMIN only) |
| `/admin/admins/new` | Create new admin |
| `/admin/announcements` | Manage announcements (marquee, pills, tags, carousel) |

### Developer Portal Pages (`apps/portal`, standalone on port 3002, no i18n)
| Route | Description |
|-------|-------------|
| `/login` | Developer login (env-configured username/password) |
| `/` | Scheme list with custom-field counts; search |
| `/schemes/:id` | Custom-fields builder — add/edit/remove fields, en/mr labels, type, required, dropdown options; saves to `schemes.custom_fields` |

---

## Authentication Flow

```
┌─────────────────────────────────────────────────────┐
│                   AUTH ARCHITECTURE                  │
│                                                     │
│  Client (React Context)                             │
│    ├── localStorage: auth_token                     │
│    ├── AuthProvider wraps entire app                 │
│    └── useAuth() → {user, token, login, logout}     │
│                                                     │
│  Login Methods:                                     │
│    1. Phone + Password → POST /auth/login → JWT     │
│    2. Google OAuth → Firebase → Backend → JWT       │
│    3. Forgot Password → Firebase Phone OTP → Reset  │
│                                                     │
│  Session:                                           │
│    ├── JWT (7-day expiry) carries userId/userType    │
│    └── Redis stores full session (7-day TTL)        │
│                                                     │
│  Guards:                                            │
│    ├── User layout: redirects unauth → /login       │
│    ├── Admin layout: redirects non-admin → /dashboard│
│    └── API middleware: JWT verify + Redis session    │
│                                                     │
│  Roles:                                             │
│    ├── Public (no auth)                             │
│    ├── USER (authenticated citizen)                 │
│    ├── ADMIN (order processing, scheme management)  │
│    └── SUPER_ADMIN (admin management)               │
└─────────────────────────────────────────────────────┘
```

---

## Payment Flow

```
User clicks "Apply" on scheme
    → Uploads required documents (optional)
    → Reviews application
    → POST /payments/create-order (Razorpay order in INR, amount in paise)
    → Razorpay checkout modal opens
    → User pays
    → POST /payments/verify (HMAC-SHA256 signature verification)
        → Order status → PAID
        → PDF receipt generated (PDFKit) → uploaded to R2
        → Notification sent to user
    → Success page with receipt download
```

---

## File Storage (Cloudflare R2)

**Key Patterns**:
```
users/{userId}/orders/{orderId}/{docType}_{timestamp}.{ext}   — User documents
users/{userId}/documents/{docType}_{timestamp}.{ext}          — Saved documents
schemes/{schemeId}/logo_{timestamp}.{ext}                     — Scheme logos
schemes/{schemeId}/reference_{timestamp}.{ext}                — Reference images
receipts/{orderId}/receipt.pdf                                — Payment receipts
proofs/{orderId}/{proofType}_{timestamp}.{ext}                — Admin proofs
announcements/{announcementId}/{timestamp}.{ext}              — Carousel images
```

**Upload Methods**:
- **Documents/Proofs**: Presigned URL → client uploads directly to R2
- **Scheme Images**: Base64 via API → server uploads to R2 (bypasses CORS)
- **Receipts**: Server-generated PDF → server uploads to R2

---

## Caching Strategy

| Cache Key | TTL | Invalidation |
|-----------|-----|-------------|
| `cache:schemes:{locale}:{category}` | 30 min | On admin create/update/delete |
| `cache:scheme:{slug}:{locale}` | 1 hour | On admin create/update/delete |
| `session:{userId}` | 7 days | On logout |
| `otp:{phone}` | 5 min | Auto-expire |
| `rate:{key}` | 10 min | Auto-expire |

---

## Rate Limiting

| Limiter | Window | Max Requests |
|---------|--------|-------------|
| Auth endpoints | 15 min | 10 |
| General API | 1 min | 100 |
| OTP endpoints | 10 min | 5 |

Redis-based. **Fails open** if Redis is unreachable.

---

## Design System

**Font**: Public Sans (Google Fonts)  
**Icons**: Material Icons + Material Symbols Outlined (CDN)  
**Approach**: CSS Modules + global design tokens in `globals.css` (731 lines)

### Color Palette
| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#1B5E20` | Government green — headers, CTAs |
| Secondary | `#FF9800` | Action orange — badges, highlights |
| Student | `#00897B` | Category card |
| Farmer | `#EF6C00` | Category card |
| Loan | `#6A1B9A` | Category card |
| Certificate | `#1E88E5` | Category card |
| + 6 more | — | Category-specific colors |

### Components (CSS)
Buttons (`.btn-primary`, `.btn-secondary`, `.btn-outline`), cards, inputs, badges, spinners, utility classes (flex, gap, margin, text alignment).

### CSS Modules (25 files)
Each page/component has its own `.module.css` file. No Tailwind CSS installed.

---

## Internationalization

| Setting | Value |
|---------|-------|
| Library | next-intl 4.8.2 |
| Locales | `en` (English), `mr` (Marathi) |
| Default | `mr` (Marathi) |
| Admin pages | English only (excluded from i18n) |
| Message files | `apps/web/messages/{en,mr}.json` (~448 lines each) |

### Translation Scopes
Common, Header, Footer, HomePage, Categories (10), Explore (4), LoginPage, SchemesPage, SchemePage, DashboardPage, OrdersPage, OrderPage, ProfilePage, Statuses (9), AuthCallback, CompleteProfilePage, ApplyPage.

---

## Environment Variables

### Backend (`apps/api`)
| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Min 32 chars |
| `UPSTASH_REDIS_REST_URL` | ✅ | Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ | Redis token |
| `R2_ACCOUNT_ID` | ✅ | Cloudflare R2 account |
| `R2_ACCESS_KEY_ID` | ✅ | R2 access key |
| `R2_SECRET_ACCESS_KEY` | ✅ | R2 secret key |
| `R2_BUCKET_NAME` | ❌ | Default: `shasansetu-documents` |
| `R2_PUBLIC_URL` | ❌ | Public URL for R2 assets |
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth |
| `GOOGLE_CALLBACK_URL` | ✅ | Google OAuth callback |
| `RAZORPAY_KEY_ID` | ✅ | Razorpay key |
| `RAZORPAY_KEY_SECRET` | ✅ | Razorpay secret |
| `RAZORPAY_WEBHOOK_SECRET` | ❌ | Webhook verification |
| `FIREBASE_*` | ❌ | Firebase Admin (project_id, client_email, private_key) |
| `JWT_EXPIRES_IN` | ❌ | Default: `7d` |
| `PORTAL_USERS` | ❌ | Developer-portal accounts: comma-separated `username:bcryptHash` (1-3) |
| `PORTAL_JWT_SECRET` | ❌ | Signs portal JWTs (separate from `JWT_SECRET`) |
| `PORTAL_TOKEN_EXPIRES_IN` | ❌ | Default: `7d` |
| `PORTAL_URL` | ❌ | Portal origin for CORS. Default: `http://localhost:3002` |
| `API_PORT` | ❌ | Default: `3001` |
| `WEB_URL` | ❌ | Default: `http://localhost:3000` |

### Frontend (`apps/web`)
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend URL (proxied via Next.js rewrites) |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase client config (apiKey, authDomain, projectId, etc.) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay public key for checkout |

---

## Migrations History

| # | Name | Changes |
|---|------|---------|
| 0000 | `tearful_blue_marvel` | **Initial schema** — 10 core tables |
| 0001 | `worried_hellcat` | `documents.file_url` & `proofs.file_url` → text |
| 0002 | `warm_network` | Add `receipt_key` to orders |
| 0003 | `even_human_torch` | Add 14 indexes (schemes, translations, orders, documents) |
| 0004 | `mixed_skrulls` | Create `feedbacks` table |
| 0005 | `noisy_silvermane` | Create `announcements` table |
| 0006 | `add_carousel_fields` | Add carousel support to announcements |
| 0008 | `ambitious_shinko_yamashiro` | Add `average_completion_days` to schemes |
| 0009 | `add_scheme_images` | Add `logo_url`, `reference_image_url` to schemes |

---

## Key Architectural Decisions

1. **Monorepo with shared packages** — DB schema and types are shared between API and web, ensuring type safety across the stack.

2. **Server-side image proxy for scheme assets** — Scheme logo/reference uploads go through the backend as base64 (bypasses R2 CORS restrictions). User document uploads use presigned URLs (client → R2 direct).

3. **Redis-backed session management** — JWT tokens carry minimal payload; full session data is in Redis with 7-day TTL, enabling server-side session invalidation.

4. **Translation architecture** — Schemes have a dedicated `scheme_translations` table (not just JSON columns), supporting proper i18n queries with locale-filtered JOINs.

5. **Soft deletes for schemes** — Schemes are set to INACTIVE rather than deleted, preserving referential integrity with existing orders.

6. **PDF receipt generation** — Server-side PDFKit generates branded receipts on payment verification, uploaded to R2 with signed download URLs.

7. **Rate limiting fails open** — If Redis is down, rate limiting is bypassed to avoid blocking legitimate users.

8. **Admin analytics tracking** — Dedicated `admin_analytics` table tracks per-admin performance metrics, updated atomically with order status changes.

9. **Custom forms owned by a separate Developer Portal** — `schemes.custom_fields` is authored only by developers via the standalone `apps/portal` app and `/api/portal/*` (env-based bcrypt auth, dedicated portal JWT). Admins manage everything else about a scheme but cannot touch custom fields; the admin endpoints reject `customFields` and leave the column untouched on update. The data stays in the existing JSONB column (no migration); the public apply flow and `orders.application_form_data` are unchanged. Portal writes call `invalidateSchemeCache()` so changes go live immediately.

---

## Development Commands

```bash
# Install dependencies
pnpm install

# Start all services (API + Web + Developer Portal)
# Web → :3000, API → :3001, Portal → :3002
pnpm run dev

# Run just the Developer Portal
pnpm --filter @shasansetu/portal dev

# Database operations
pnpm run db:generate     # Generate Drizzle migrations
pnpm run db:migrate      # Run migrations
pnpm run db:push         # Push schema directly (dev)
pnpm run db:studio        # Open Drizzle Studio

# Build
pnpm run build

# Clean
pnpm run clean
```

---

## Current Status & Recent Changes

### Completed Features
- ✅ Full user authentication (phone+password, Google OAuth, OTP reset)
- ✅ Scheme CRUD with bilingual translations (EN/MR)
- ✅ Scheme image management (logo + reference image via R2)
- ✅ 4-step application wizard with document upload
- ✅ Razorpay payment integration with PDF receipt generation
- ✅ Admin order management (pick up, verify docs, upload proofs, complete)
- ✅ Admin analytics dashboard
- ✅ Notification system with SSE streaming
- ✅ Announcement system (marquee, pills, popular tags, carousel)
- ✅ 10 scheme categories (Student, Farmer, Loan, Certificate, Jobs, Health, Govt Card, Licence, Tax, Other)
- ✅ Cookie consent banner
- ✅ Info pages (FAQ, Help, Contact, Privacy, Terms, Disclaimer)
- ✅ Application tracking (public)
- ✅ Feedback/rating system
- ✅ Responsive design

### Known Considerations
- SWR is installed but unused — all data fetching uses `useEffect` + `api.request()`
- Some admin components use Tailwind-like class names in JSX but Tailwind is not installed (they rely on utility classes defined in `globals.css`)
- Auth guards are client-side only (no server-side middleware auth beyond i18n)
- R2 CORS for direct uploads requires bucket-level configuration for production domains
