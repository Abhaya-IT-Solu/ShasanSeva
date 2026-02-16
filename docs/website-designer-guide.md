# ShasanSeva — Website Designer Guide

> **Purpose:** This document is a zero-assumption reference for a designer tasked with creating a modern, minimal, premium visual redesign of the ShasanSeva web application. It describes every page, every UI element, every interaction, and every data point currently displayed — so the designer can reimagine the look without changing system behavior.
>
> **Design Reference:** [PMFBY — Pradhan Mantri Fasal Bima Yojana](https://pmfby.gov.in/)
>
> **Scope:** Visual presentation only. No new fields, no new flows, no functional changes.

---

## Table of Contents

1. [Project Context](#1-project-context)
2. [Global Layout & Shared Components](#2-global-layout--shared-components)
3. [User-Facing Pages](#3-user-facing-pages)
4. [Admin Pages](#4-admin-pages)
5. [Current Design System](#5-current-design-system)
6. [Structural & Codebase Notes for Designer](#6-structural--codebase-notes-for-designer)

---

## 1. Project Context

**ShasanSeva** is a citizen-facing government services portal. Users browse government/private schemes, apply for them (optionally uploading documents), pay a service fee via Razorpay, and track their application status. Admins manage schemes, process orders, and manage users.

### Key Facts
- **Target users:** Indian citizens (primarily Marathi-speaking in Maharashtra)
- **Languages:** English + Marathi (toggle in header)
- **Payment:** Razorpay integration
- **File uploads:** PDF, JPG, PNG, WebP → Cloudflare R2
- **Mobile app:** Coming soon (teaser on homepage)
- **Admin roles:** Admin + Super Admin (Super Admin has extra permissions)

---

## 2. Global Layout & Shared Components

### 2.1 Header (User Pages)

The header is a **two-tier bar** shown on all user-facing pages (hidden on admin pages).

#### Tier 1 — Utility Bar (top, narrow)
| Position | Element | Details |
|---|---|---|
| Left | WhatsApp link | Icon + "+91 98765 43210" |
| Left | Helpline link | Phone icon + "Helpline: 1800-123-456" |
| Right | Language Switcher | Toggles between English ↔ मराठी |

#### Tier 2 — Sticky Navbar (main navigation)
| Position | Element | Details |
|---|---|---|
| Left | Logo | Image: `/logo/logo_icon.png` — links to homepage |
| Right (logged out) | "Login" button | Ghost/secondary style button → `/login` |
| Right (logged out) | "Register" button | Primary filled button → `/login` |
| Right (logged in) | Avatar button | Circle showing first letter of user name (uppercase) → toggles dropdown |
| Right (loading) | Spinner | Small loading spinner while auth state resolves |

#### Avatar Dropdown (logged in)
| Item | Icon | Destination |
|---|---|---|
| Dashboard | 🏠 | `/dashboard` |
| My Orders | 📦 | `/orders` |
| Profile | 👤 | `/profile` |
| Logout | 🚪 | Logs out user |

---

### 2.2 Footer

Present on the homepage. 4-column layout, dark background.

| Column | Contents |
|---|---|
| **Brand** | Logo image (brightened filter), tagline text |
| **Quick Links** | All Schemes, Student Schemes, Farmer Schemes, Loan Schemes |
| **Support** | Help Center, Contact Us, FAQs, Track Application |
| **Contact** | 📞 Phone number, 📧 Email, 📍 Location text |

**Bottom Bar:**
- Left: `© {year} ShasanSeva. All rights reserved.`
- Right: Privacy Policy · Terms of Service · Disclaimer

**Disclaimer:** A final line of small disclaimer text at the very bottom.

---

### 2.3 Admin Sidebar

Used on all admin pages. **Currently duplicated inline in each admin page** (not a shared layout component) — so the design will be applied once and shared.

| Element | Details |
|---|---|
| Logo | `/logo/logo_icon.png` (200×100) |
| Badge | "Super Admin" or "Admin" depending on role |
| Nav Links | 📊 Dashboard · 📋 Schemes · 📦 Orders · 👥 Users · 🔐 Admins (Super Admin only) |
| Footer (some pages) | User name/phone + Logout button |

**Active state:** Current page link is highlighted.

---

### 2.4 Common UI Patterns

These patterns are used across many pages:

| Pattern | Usage |
|---|---|
| **`.btn.btn-primary`** | Blue filled button — all CTAs |
| **`.btn.btn-secondary`** | Ghost/outlined buttons — secondary actions |
| **`.spinner`** | CSS loading spinner — used everywhere for loading states |
| **`.input` + `.input-group` + `.input-label`** | Standard form inputs with labels |
| **Status badges** | Colored pill badges (paid=blue, in_progress=amber, completed=green, rejected=red, etc.) |
| **Empty states** | Icon + text + CTA button when lists are empty |
| **Error alerts** | Red-tinted alert boxes for error messages |
| **Back links** | `← Back to X` text links at top of detail pages |

---

## 3. User-Facing Pages

### 3.1 Homepage (`/`)

No hero section currently. The page starts immediately with the categories section.

#### Section A — "Our Services" (Categories Grid)
- **Section header:** Title + subtitle text
- **Grid:** 9 cards in a responsive grid (3×3 on desktop, wraps on mobile)

**Each category card:**

| Element | Details |
|---|---|
| Accent bar | Thin colored bar at top (each category has unique color) |
| "NEW" badge | Shown only for certain categories (STUDENT, FARMER, WOMEN) |
| Icon area | Either a GIF image (graduation.gif, tractor.gif, loan.gif, stamp.gif) or an emoji fallback |
| Title | Category name — colored text |
| Description | Short description text |
| Action row | "View Schemes →" text + arrow icon |

**Categories (9 total):**

| ID | Icon/GIF | Color | Has "NEW" badge |
|---|---|---|---|
| STUDENT | 🎓 / graduation.gif | #00897B | ✓ |
| FARMER | 🌾 / tractor.gif | #EF6C00 | ✓ |
| LOAN | 💰 / loan.gif | #6A1B9A | ✗ |
| CERTIFICATE | 📜 / stamp.gif | #1E88E5 | ✗ |
| EMPLOYMENT | 💼 | #D32F2F | ✗ |
| HEALTH | 🏥 | #388E3C | ✗ |
| WOMEN | 👩 | #E91E63 | ✓ |
| SENIOR | 👴 | #795548 | ✗ |
| OTHER | 📋 | #9C27B0 | ✗ |

**Click behavior:** Navigates to `/schemes?category={ID}`

---

#### Section B — Mobile App Showcase
- **Badge:** `📱 Coming Soon` pill badge
- **Title:** Translated mobile app title
- **Description:** Translated description text
- **Feature list:** 4 features with ✓ checkmarks
- **Store buttons:** App Store + Google Play buttons (both `disabled`)
- **Phone mockup:** CSS mockup phone frame containing:
  - 🏛️ logo emoji
  - "ShasanSeva" text
  - "Your Helper" subtitle

---

#### Section C — "Explore More" Grid
- **4 cards** in a row
- Each card: colored icon background + title + description + "Learn More →" link

| Key | Icon | Color | Destination |
|---|---|---|---|
| Exam Results | 📝 | #2563eb | `/explore/results` |
| Job Notifications | 💼 | #059669 | `/explore/jobs` |
| News Updates | 📰 | #d97706 | `/explore/news` |
| Important Dates | 📅 | #dc2626 | `/explore/dates` |

---

#### Section D — Footer
(See [2.2 Footer](#22-footer))

---

### 3.2 Login / Register (`/login`)

Full-page centered card layout, no header/footer. Gradient or plain background.

| Element | Details |
|---|---|
| Logo | `/logo/logo_text.png` (200×50) — links to homepage |
| **Card** | Main login card |
| Tabs | Two tabs: "Login" / "Register" — underline/pill active indicator |
| Subtitle | Changes based on active tab |
| Error alert | Red error message box (shown on validation/API failure) |

**Form fields (Login tab):**

| Field | Type | Details |
|---|---|---|
| Phone | tel | "+91" prefix badge + 10-digit input, digits only |
| Password | password | Toggle show/hide button (emoji 👁️ / 👁️‍🗨️) |
| Submit | button | "Login" text, disabled until phone=10 digits + password≥8 chars |

**Form fields (Register tab):**

| Field | Type | Details |
|---|---|---|
| Name | text | Optional |
| Phone | tel | Same as login |
| Password | password | Same + hint text: "Min 8 chars, at least 1 number" |
| Confirm Password | password | Must match |
| Submit | button | "Register" text |

**Divider:** "— or continue with —"

**Google button:** Full-width button with Google SVG icon + "Sign in with Google"

**Footer text:** Terms of service text at bottom of card.

---

### 3.3 Complete Profile (`/complete-profile`)

Full-page centered card, no header/footer. Shown after first registration.

| Element | Details |
|---|---|
| Header | 👤 icon + "Complete Your Profile" title + subtitle |
| Error alert | Red alert for validation errors |

**Form fields:**

| Field | Type | Required | Details |
|---|---|---|---|
| Full Name | text | ✓ | Pre-filled from user data if available |
| Email | email | ✗ | Pre-filled from OAuth data |
| Mobile Number | tel | ✓ (OAuth users only) | +91 prefix badge, shown conditionally |
| Category ("I am a") | selection | ✓ | **4 clickable cards in grid** — not a dropdown |
| Address Line 1 | text | ✗ | |
| Address Line 2 | text | ✗ | |
| City | text | ✗ | |
| State | text | ✗ | |
| Pincode | text | ✗ | 6 digits |

**Category selection cards (2×2 grid):**

| Value | Icon |
|---|---|
| STUDENT | 🎓 |
| FARMER | 🌾 |
| LOAN_CANDIDATE | 💰 |
| OTHER | 📋 |

Each card shows icon + label. Selected card has highlighted border/background.

**Actions:**
- "Complete Profile" button (primary, full-width)
- "Skip for now" button (text/ghost style) → navigates to `/orders`

---

### 3.4 Schemes List (`/schemes`)

Uses the global Header. No sidebar.

| Element | Details |
|---|---|
| Title row | Left: Page title (either "All Schemes" or category name), subtitle text |
| Title actions | "← View All" link (when filtered by category) + Search toggle button (🔍 icon + "Search") |
| Search bar | Expandable: appears below title when toggled. Input + "Search" button + ✕ close |

**Scheme cards — responsive grid (2-3 columns):**

Each card is a clickable link (`/schemes/{slug}`):

| Element | Details |
|---|---|
| Card header | Category badge (colored pill) + Scheme type badge (🏛️ GOVERNMENT or 🏢 PRIVATE) |
| Title | Scheme name (h3) |
| Description | Truncated to 100 chars + "..." |
| Card footer | "Service Fee: ₹{amount}" + "→" arrow |

**Category badge colors:**
- STUDENT, FARMER, LOAN, CERTIFICATE, EMPLOYMENT, HEALTH, WOMEN, SENIOR, OTHER — each has a unique CSS class with distinct colors.

**Empty state:** Text message + optional search term shown.

---

### 3.5 Scheme Detail (`/schemes/{slug}`)

Two-column layout (content + sidebar) with Header.

#### Left Column — Content

| Section | Element | Details |
|---|---|---|
| Header | Category badge | Colored pill |
| Header | Type badge | 🏛️ Government or 🏢 Private |
| Header | Title (h1) | Scheme name |
| Header | Description | Full text |
| Eligibility | h2 + content | Text block (conditional — only shown if data exists) |
| Benefits | h2 + content | Text block (conditional) |
| Required Documents | h2 + list | List of document items |

**Each document item:**
- Document label text
- "Required" badge (if required)
- Description text (if present)
- "No documents required" message (if list is empty)

#### Right Column — Sidebar Apply Card (sticky)

| Element | Details |
|---|---|
| Fee label | "Service Fee" |
| Fee amount | ₹{amount} (large text) |
| Disclaimer | Bold "Note:" + disclaimer text |
| Apply button | Full-width primary button → "Apply Now" |
| Apply note | Small text below button |

**Apply button behavior:**
- If authenticated → navigates to `/apply/{slug}`
- If not authenticated → navigates to `/login`

**Error page (scheme not found):**
- Title + error message + "Browse Schemes" button

---

### 3.6 Apply for Scheme (`/apply/{slug}`)

Multi-step wizard with Header. 4 steps. Back link to scheme detail at top.

#### Progress Bar
Horizontal stepper showing 4 steps:

| Step | Label | Number |
|---|---|---|
| 1 | Documents | 1 |
| 2 | Review | 2 |
| 3 | Payment | 3 |
| 4 | Done | 4 |

Active step: highlighted. Previous steps: marked completed. Future steps: dimmed.

---

#### Step 1: Upload Documents

| Element | Details |
|---|---|
| Title | "Upload Documents" |
| Subtitle | Instruction text |
| Skip note | 💡 info box — documents can be uploaded later |

**Document list:** One row per required document:

| Element | Details |
|---|---|
| Document label | Name + "Recommended" tag (if required) |
| Description | Optional description text |
| Upload area | File input (accepts PDF, JPG, PNG, WebP) — shows one of 3 states: |
| — Default | "Choose File" button |
| — Uploading | Spinner + "Uploading..." |
| — Uploaded | ✓ + filename |

**Bottom actions:**
- "Skip for Now" button (secondary)
- "Continue to Review" button (primary)

Both advance to Step 2 regardless.

---

#### Step 2: Review Application

| Element | Details |
|---|---|
| Title | "Review Application" |
| Review card 1 | h3 "Scheme" + scheme name |
| Review card 2 | h3 "Uploaded Documents" + list of uploaded filenames with ✓ |
| Review card 3 | h3 "Service Fee" + ₹{amount} (large) |
| Disclaimer | Bold "Note:" + disclaimer text |

**Bottom actions:**
- "← Back" button (secondary) → Step 1
- "Proceed to Payment — ₹{amount}" button (primary) → opens Razorpay checkout & advances to Step 3

---

#### Step 3: Payment Processing

| Element | Details |
|---|---|
| Title | "Processing Payment" |
| Spinner | Loading spinner |
| Text | Payment instructions |
| Retry button | "Retry Payment" (secondary) — reopens Razorpay |

(Razorpay modal opens on top — branded blue #2563eb theme)

---

#### Step 4: Success

| Element | Details |
|---|---|
| Success icon | Large ✓ checkmark |
| Title | "Application Submitted" |
| Message | Success message text |
| Order ID | Displayed order ID |
| "What's Next" section | h3 + 3 list items (next steps) |

**Bottom actions:**
- "View Applications" button (primary) → `/orders`
- "Back to Home" button (secondary) → `/`

---

### 3.7 User Dashboard (`/dashboard`)

Simple page with Header.

| Element | Details |
|---|---|
| Welcome | "Welcome, {name}! 👋" + subtitle |

**Quick Actions — 3 cards in a row:**

| Card | Icon | Title | Description | Destination |
|---|---|---|---|---|
| Browse Schemes | 📋 | Browse Schemes | Browse description | `/` |
| My Applications | 📦 | My Applications | Applications description | `/orders` |
| My Documents | 📄 | My Documents | Documents description | `/profile` |

**Recent Applications section:**
- Header: "My Applications" + "View All →" link
- **Empty state:** 📋 icon + "No applications" text + "Browse Schemes" button
- **With data:** List of clickable order cards, each showing:
  - Scheme name (h4)
  - Date applied
  - Status badge (colored by status)

---

### 3.8 Orders List (`/orders`)

Simple list page with Header.

| Element | Details |
|---|---|
| Title | h1 "My Applications" |

**Order cards — vertical list:**

Each card is a Link to `/orders/{id}`:

| Element | Details |
|---|---|
| Left: Scheme name | h3 |
| Left: Date | "Applied on {date}" |
| Right: Amount | ₹{amount} |
| Right: Status badge | Colored pill — colors vary by status |

**Status color mapping:**

| Status | Color |
|---|---|
| PENDING_PAYMENT | yellow |
| PAID | blue |
| IN_PROGRESS | orange |
| DOCUMENTS_VERIFIED | purple |
| COMPLETED | green |
| REJECTED | red |

**Empty state:** 📋 + "No orders" + "Browse Schemes" button.

---

### 3.9 Order Detail (`/orders/{id}`)

Detail page with Header. Multiple sections stacked vertically.

| Element | Details |
|---|---|
| Back link | "← Back to Orders" |
| Page title | Scheme name (h1) |
| Order meta | Order number `#{last8chars}` + status badge (colored) |

#### Timeline section
- h2 "Application Status"
- Horizontal stepper: PAID → IN_PROGRESS → DOCUMENTS_VERIFIED → COMPLETED
- Each step: dot + label. Completed steps are filled/connected. Current step highlighted.
- **If REJECTED:** Red box with ❌ + "Application Rejected" + rejection reason

#### Details Grid — 3 cards

| Card | Icon | Contents |
|---|---|---|
| Payment | 💰 | ₹{amount} + "Paid on {date}" |
| Timeline | 📅 | "Applied: {date}" + "Completed: {date}" (if applicable) |
| Scheme | 📋 | Scheme name + truncated description |

#### Documents section
- h2 "Documents"
- List of document items, each showing:
  - 📄 icon + filename + document type
  - Status badge: 📤 Uploaded / ✅ Verified / ❌ Rejected
  - Rejection reason text (if applicable)
- Empty state: "No documents" text

#### Help section
- Blue/info-tinted card
- ❓ icon + "Need Help?" title
- Contact email + phone links

---

### 3.10 Profile (`/profile`)

Single card page with Header.

| Element | Details |
|---|---|
| Page header | h1 "My Profile" + "Edit Profile" button (links to `/complete-profile`) |

**Profile card — sections:**

#### Profile Header
- Large avatar circle (first letter of name)
- Name (h2)
- Phone number
- Email (if present)

#### Category Section
- h3 "Category"
- Category badge (emoji + category name)

#### Address Section
- h3 "Address"
- Multi-line address display (line1, line2, city/state - pincode)
- "No address" message if empty

#### Account Section
- h3 "Account"
- Two info rows: "Member Since: {date}" + "Profile Status: ✓ Complete / Incomplete"

#### Security Section
- h3 "Security"
- Success message (after password change)
- "🔐 Change Password" button (secondary) — toggles password form
- **Password change form (expandable):**
  - Current Password input
  - New Password input (with hint)
  - Confirm New Password input
  - Cancel + Change Password buttons

---

## 4. Admin Pages

### 4.1 Admin Dashboard (`/admin/dashboard`)

Uses the shared admin layout (sidebar + main content area).

#### Stats Row — 4 cards

| Card | Value | Label |
|---|---|---|
| 1 | count | New Orders |
| 2 | count | In Progress |
| 3 | count | Completed Today |
| 4 | count | Total Users |

#### Recent Orders Table

| Column | Details |
|---|---|
| User | User name |
| Scheme | Scheme name |
| Amount | ₹{amount} |
| Status | Colored pill badge |
| Date | Formatted date |

Header: "Recent Orders" + "View All" button → `/admin/orders`

#### Quick Actions
- "+ Add New Scheme" button (primary) → `/admin/schemes/new`
- "+ Add Admin" button (outline, Super Admin only) → `/admin/admins/new`

---

### 4.2 Admin Orders (`/admin/orders`)

Has its **own sidebar** inline (not from the shared layout). Two-column layout: sidebar + main.

#### Status Tabs
Horizontal tab bar:

| Tab | Value |
|---|---|
| All | ALL |
| Paid | PAID |
| In Progress | IN_PROGRESS |
| Proof Uploaded | PROOF_UPLOADED |
| Completed | COMPLETED |
| Cancelled | CANCELLED |

Active tab is highlighted. Clicking a tab filters the table and resets to page 1.

#### Orders Table

| Column | Details |
|---|---|
| Order ID | First 8 chars + "..." |
| User | Name + phone (stacked) |
| Scheme | Scheme name |
| Amount | ₹{amount} |
| Status | Colored pill badge |
| Date | Formatted date |
| Actions | Conditional buttons (see below) |

**Action buttons by status:**

| Current Status | Button | New Status |
|---|---|---|
| PAID | "Pick Up" | IN_PROGRESS |
| IN_PROGRESS (assigned to me) | "Upload Proof" | PROOF_UPLOADED |
| PROOF_UPLOADED | "Complete" | COMPLETED |
| COMPLETED / CANCELLED | "-" (no action) | — |

#### Pagination
Bottom of table — page navigation component with page number + total count.

---

### 4.3 Admin Order Detail (`/admin/orders/{id}`)

Two-column layout (own sidebar + main content). Back link "← Back to Orders".

#### Status & Actions Card
- Current status badge (large, colored)
- "Assigned to: You / Admin ID: {id}" text
- **Action buttons** (conditional, same logic as orders table):
  - 📋 Pick Up Order
  - 📤 Mark Proof Uploaded
  - ✅ Mark Complete
  - ❌ Cancel Order
- If no actions available: "This order is finalized / assigned to another admin" message

#### Order Information Card
Grid of 6 key-value pairs:

| Label | Value |
|---|---|
| Order ID | Full UUID |
| Scheme | Scheme name |
| Category | Scheme category |
| Payment Amount | ₹{amount} |
| Payment ID | Payment ID or "N/A" |
| Created At | Full datetime |

#### Submitted Documents Table

| Column | Details |
|---|---|
| Document Type | Document type label |
| Status | Colored badge: PENDING / VERIFIED / REJECTED |
| Uploaded At | Full datetime |

Empty state: "No documents submitted."

#### Admin Notes
- Textarea for internal notes
- Pre-filled with any existing notes

---

### 4.4 Admin Schemes (`/admin/schemes`)

Uses shared admin layout. Header: "Manage Schemes" + "+ Add Scheme" button.

#### Schemes Table (custom div-based table, not `<table>`)

| Column | Details |
|---|---|
| Name | Scheme name |
| Category | Category label |
| Type | GOVERNMENT / PRIVATE |
| Fee | ₹{amount} |
| Status | Clickable toggle button: ACTIVE (green) / INACTIVE (red) |
| Actions | "Edit" link → `/admin/schemes/{id}/edit` + "View" link → `/schemes/{slug}` (opens in new tab) |

Empty state: "No schemes found. Add your first scheme!"

---

### 4.5 Admin Users (`/admin/users`)

Two-column layout (own sidebar + main).

#### Header
- h1 "Users" + subtitle "View all registered users"
- Search box (icon + input): searches by name, phone, or email (client-side filter)

#### Users Table

| Column | Details |
|---|---|
| Name | User name or "-" |
| Phone | Phone number |
| Email | Email or "-" |
| Profile | Badge: "Complete" (green) / "Incomplete" (amber) |
| Joined | Formatted date |
| Actions | "View" button → opens modal |

#### Stats Cards (below table)
Two cards: "Total Users" (count) + "Complete Profiles" (count).

#### User Detail Modal (overlay)
Triggered by "View" button. Shows:
- Name, Phone, Email, Profile Status (badge), Joined date
- "Close" button

---

### 4.6 Admin Management (`/admin/admins`) — Super Admin Only

Two-column layout (own sidebar). Redirects non-Super Admins to dashboard.

#### Header
- h1 "Admin Management" + subtitle
- "+ Add Admin" button → opens Create Modal

#### Admins Table

| Column | Details |
|---|---|
| Name | Admin name |
| Phone | Phone number |
| Email | Email or "-" |
| Role | Badge: "Super Admin" (special styling) / "Admin" |
| Status | Badge: "Active" (green) / "Inactive" (red) |
| Actions | ✏️ Edit button + Activate/Deactivate toggle button (not shown for self) |

#### Create Admin Modal
Form fields:
- Name * (text)
- Phone * (tel)
- Email (email, optional)
- Password * (password, min 8)
- Role * (dropdown: Admin / Super Admin)
- Cancel + Create Admin buttons

#### Edit Admin Modal
Same fields as Create, except:
- Password field placeholder: "Enter new password..." with hint "leave blank to keep current"
- Role dropdown disabled for editing self + hint text
- Update Admin button

---

## 5. Current Design System

### 5.1 Colors (CSS Variables)

| Token | Value | Usage |
|---|---|---|
| `--color-primary` | #2563eb | Primary buttons, links, accents |
| `--color-primary-dark` | #1d4ed8 | Button hover |
| `--color-primary-light` | #dbeafe | Light backgrounds |
| `--color-success` | #10b981 | Completed badges, success states |
| `--color-warning` | #f59e0b | In-progress badges |
| `--color-danger` | #ef4444 | Error states, rejected badges |
| `--color-gray-50` to `--color-gray-900` | Gray scale | Text, backgrounds, borders |
| `--color-white` | #ffffff | Card backgrounds |

### 5.2 Typography

| Token | Value |
|---|---|
| Font family | System stack (no custom font loaded) |
| `--text-xs` | 0.75rem |
| `--text-sm` | 0.875rem |
| `--text-base` | 1rem |
| `--text-lg` | 1.125rem |
| `--text-xl` | 1.25rem |
| `--text-2xl` | 1.5rem |
| `--text-3xl` | 1.875rem |
| `--text-4xl` | 2.25rem |

### 5.3 Spacing

Uses `--space-1` (0.25rem) through `--space-12` (3rem) tokens.

### 5.4 Borders & Shadows

| Token | Value |
|---|---|
| `--radius-sm` | 0.25rem |
| `--radius-md` | 0.5rem |
| `--radius-lg` | 0.75rem |
| `--radius-xl` | 1rem |
| `--radius-full` | 9999px |
| `--shadow-sm` | Subtle box shadow |
| `--shadow-md` | Medium box shadow |
| `--shadow-lg` | Large box shadow |

### 5.5 Transitions

- `--transition-fast` — 150ms
- `--transition-normal` — 250ms

---

## 6. Structural & Codebase Notes for Designer

### Bilingual Support
- Every user-facing page supports English + Marathi
- All UI text comes from translation files (no hardcoded strings in user pages)
- Admin pages are currently English-only (hardcoded strings)
- **Design must account for Marathi text** which is typically 20-40% longer than English equivalents

### Duplicate Pages (cleanup pending)
10 legacy pages without locale routing exist as duplicates. Will be removed — designer should only consider the locale-routed versions.

### Icons
- Currently using **emoji characters** throughout (📋 📦 🎓 etc.)
- Some category cards use **GIF images** (`graduation.gif`, `tractor.gif`, `loan.gif`, `stamp.gif`)
- **Recommendation for designer:** Plan for proper SVG icon system

### Responsive Behavior
- Category grid: 3 columns → 2 columns → 1 column
- Scheme detail: 2 columns (content + sidebar) → stacked on mobile
- Admin layout: sidebar + main content → sidebar should collapse/hamburger on mobile
- Tables: horizontal scroll on small screens

### Shared Components to Design
1. **Header** (utility bar + navbar + avatar dropdown)
2. **Footer** (4-column)
3. **Admin Sidebar** (logo + badge + nav + footer)
4. **Buttons** (primary, secondary, outline, ghost, sizes: sm/md/lg/full)
5. **Form inputs** (text, tel, email, password with toggle, textarea, select dropdown)
6. **Cards** (scheme card, stat card, action card, detail card, review card)
7. **Tables** (admin data tables with column headers)
8. **Status badges** (6+ statuses with distinct colors)
9. **Progress stepper** (horizontal 4-step)
10. **Timeline** (horizontal status tracker)
11. **Modals** (overlay + card — used in admin for user detail, create/edit admin)
12. **Pagination** (page navigation)
13. **Category selection** (2×2 clickable card grid)
14. **Search bar** (expandable, inline)
15. **Tab bar** (horizontal, for login tabs + admin status filters)
16. **Empty states** (icon + text + button)
17. **Error / success alerts** (colored message boxes)
18. **Loading spinners** (inline + page-level)
19. **Avatar** (circle with initial letter)
20. **Dropdown** (positioned below trigger)

---

> **End of Designer Guide**
>
> This document describes the current state. The designer should reimagine the visual presentation — layout, spacing, colors, typography, iconography, micro-animations — while keeping all listed elements and their behavior intact.
