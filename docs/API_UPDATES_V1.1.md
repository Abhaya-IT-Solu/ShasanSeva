# ShasanSeva API Updates — v1.1.0

> **Changelog Date:** March 2026  
> **Base Reference:** [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

This document covers all new endpoints and changes introduced in v1.1.0:

1. [Admin Notes (Orders)](#1-admin-notes)
2. [User Feedback](#2-user-feedback)
3. [Announcements (Homepage Content)](#3-announcements)
4. [Proof Upload on Completed Orders](#4-proof-upload-on-completed-orders)

---

## 1. Admin Notes

Admins can now **save notes** on any order. Notes are persisted in the `adminNotes` column of the `orders` table and shown read-only to the user on their order detail page.

### `PATCH /api/orders/:id/notes`

**Auth:** Admin only (`authMiddleware` + `adminMiddleware`)

**Request Body:**

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `adminNotes` | `string` | **Yes** | Max 2000 chars | Notes to save |

**Example:**
```json
{
  "adminNotes": "Waiting for updated income certificate. Follow up Monday."
}
```

**Success (200):**
```json
{
  "success": true,
  "data": {
    "orderId": "e5f6a7b8-...",
    "adminNotes": "Waiting for updated income certificate. Follow up Monday.",
    "message": "Notes saved successfully"
  }
}
```

**Errors:**

| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | Missing or exceeds 2000 chars |
| 404 | `NOT_FOUND` | Order doesn't exist |

**Side Effects:** Updates `adminNotes` and `updatedAt` on the order.

> **User visibility:** Admin notes appear in a read-only card on the user's order detail page, giving them context about processing status.

---

## 2. User Feedback

After an order reaches `COMPLETED` status, the user can submit **one** star rating (1–5) with an optional text comment. Admins see the feedback on the order detail page.

### Database: `feedbacks` Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | **PK**, auto-generated | Unique feedback ID |
| `orderId` | `uuid` | **FK → orders.id**, UNIQUE | One feedback per order |
| `userId` | `uuid` | **FK → users.id** | Who submitted |
| `rating` | `integer` | NOT NULL, 1–5 | Star rating |
| `comment` | `text` | nullable | Optional text (max 1000 chars) |
| `createdAt` | `timestamp` | default `now()` | Submission time |

---

### 2.1 Submit Feedback

#### `POST /api/feedbacks`

**Auth:** User (must own the order)

**Request Body:**

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `orderId` | `string (uuid)` | **Yes** | Valid UUID | The completed order |
| `rating` | `number` | **Yes** | Integer 1–5 | Star rating |
| `comment` | `string` | No | Max 1000 chars | Optional comment |

**Example:**
```json
{
  "orderId": "e5f6a7b8-c9d0-1234-abcd-ef5678901234",
  "rating": 5,
  "comment": "Very fast processing, got my certificate in 2 days!"
}
```

**Success (201):**
```json
{
  "success": true,
  "data": {
    "feedback": {
      "id": "fb1a2b3c-...",
      "orderId": "e5f6a7b8-...",
      "userId": "user-uuid",
      "rating": 5,
      "comment": "Very fast processing, got my certificate in 2 days!",
      "createdAt": "2026-01-25T14:30:00.000Z"
    },
    "message": "Feedback submitted successfully"
  }
}
```

**Errors:**

| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | Order not `COMPLETED` |
| 400 | `VALIDATION_ERROR` | Feedback already submitted for this order |
| 400 | `VALIDATION_ERROR` | Invalid rating or missing fields |
| 403 | `FORBIDDEN` | User doesn't own this order |
| 404 | `NOT_FOUND` | Order doesn't exist |

---

### 2.2 Get Feedback for Order

#### `GET /api/feedbacks/order/:orderId`

**Auth:** User (must own the order) or Admin

**Path Params:** `orderId` — Order UUID

**Response — Feedback exists (200):**
```json
{
  "success": true,
  "data": {
    "id": "fb1a2b3c-...",
    "orderId": "e5f6a7b8-...",
    "userId": "user-uuid",
    "rating": 5,
    "comment": "Very fast processing!",
    "createdAt": "2026-01-25T14:30:00.000Z"
  }
}
```

**Response — No feedback yet (200):**
```json
{
  "success": true,
  "data": null
}
```

**Errors:**

| Status | Code | When |
|--------|------|------|
| 403 | `FORBIDDEN` | User doesn't own the order and is not admin |

---

### Feedback Quick Reference

| # | Method | Endpoint | Auth | Role |
|---|--------|----------|------|------|
| 1 | `POST` | `/api/feedbacks` | ✅ | User |
| 2 | `GET` | `/api/feedbacks/order/:orderId` | ✅ | User/Admin |

---

## 3. Announcements

A unified system for admin-managed homepage content. All three homepage elements — **marquee ticker**, **hero pills**, and **popular tags** — are stored in one `announcements` table and served through a single public API.

### Database: `announcements` Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | **PK**, auto-generated | Unique ID |
| `type` | `varchar(20)` | NOT NULL | `MARQUEE`, `PILL`, or `POPULAR_TAG` |
| `title` | `varchar(255)` | NOT NULL | Display text |
| `link` | `varchar(500)` | nullable | Navigation URL when clicked |
| `isActive` | `boolean` | NOT NULL, default `true` | Show on homepage? |
| `sortOrder` | `integer` | NOT NULL, default `0` | Display order (lower = first) |
| `createdAt` | `timestamp` | default `now()` | Creation time |

### Announcement Types

| Type | Location | Description |
|------|----------|-------------|
| `MARQUEE` | Green ticker below header | Scrolling notifications that loop |
| `PILL` | Badge(s) above hero title | Pill badges with pulse dot |
| `POPULAR_TAG` | Below search bar | Clickable popular search terms |

---

### 3.1 Get Public Announcements

#### `GET /api/announcements/public`

**Auth:** None (public)

Returns active announcements grouped by type. The homepage fetches this on load.

**Success (200):**
```json
{
  "success": true,
  "data": {
    "marquee": [
      {
        "id": "uuid-1",
        "type": "MARQUEE",
        "title": "PM Kisan 17th Installment Released — Apply Now!",
        "link": "/en/schemes/pm-kisan",
        "isActive": true,
        "sortOrder": 0,
        "createdAt": "2026-03-01T10:00:00.000Z"
      }
    ],
    "pills": [
      {
        "id": "uuid-2",
        "type": "PILL",
        "title": "Ration Card Update Available",
        "link": "/en/schemes/ration-card",
        "isActive": true,
        "sortOrder": 0,
        "createdAt": "2026-03-01T10:00:00.000Z"
      }
    ],
    "popularTags": [
      {
        "id": "uuid-3",
        "type": "POPULAR_TAG",
        "title": "PM Kisan",
        "link": "/schemes?category=FARMER",
        "isActive": true,
        "sortOrder": 0,
        "createdAt": "2026-03-01T10:00:00.000Z"
      }
    ]
  }
}
```

> **Frontend fallback:** If `marquee` array is empty, the ticker is hidden. If `pills` or `popularTags` are empty, static hardcoded fallback content is shown.

---

### 3.2 List All Announcements (Admin)

#### `GET /api/announcements`

**Auth:** Admin only

Returns **all** announcements (active + inactive), sorted by `sortOrder`. Used by the admin management page.

---

### 3.3 Create Announcement (Admin)

#### `POST /api/announcements`

**Auth:** Admin only

**Request Body:**

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `type` | `string` | **Yes** | `MARQUEE` / `PILL` / `POPULAR_TAG` | Announcement type |
| `title` | `string` | **Yes** | 1–255 chars | Display text |
| `link` | `string` | No | Max 500 chars | Navigation URL |
| `isActive` | `boolean` | No | Default: `true` | Show on homepage |
| `sortOrder` | `number` | No | Integer, default: `0` | Display order |

**Example:**
```json
{
  "type": "MARQUEE",
  "title": "New Scholarship Scheme — Apply Before March 31!",
  "link": "/en/schemes/new-scholarship",
  "isActive": true,
  "sortOrder": 1
}
```

**Success (201):** Returns the created announcement object.

---

### 3.4 Update Announcement (Admin)

#### `PATCH /api/announcements/:id`

**Auth:** Admin only

All fields optional. Only provided fields are updated.

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | Change type |
| `title` | `string` | Update text |
| `link` | `string \| null` | Update or clear link |
| `isActive` | `boolean` | Toggle visibility |
| `sortOrder` | `number` | Change order |

**Example — Toggle off:**
```json
{ "isActive": false }
```

**Errors:** Returns `404` if announcement not found.

---

### 3.5 Delete Announcement (Admin)

#### `DELETE /api/announcements/:id`

**Auth:** Admin only

**Hard-deletes** the announcement permanently.

**Success (200):**
```json
{
  "success": true,
  "data": { "message": "Announcement deleted" }
}
```

**Errors:** Returns `404` if not found.

---

### Announcements Quick Reference

| # | Method | Endpoint | Auth | Role | Description |
|---|--------|----------|------|------|-------------|
| 1 | `GET` | `/api/announcements/public` | ❌ | Public | Active items grouped by type |
| 2 | `GET` | `/api/announcements` | ✅ | Admin | List all (active + inactive) |
| 3 | `POST` | `/api/announcements` | ✅ | Admin | Create |
| 4 | `PATCH` | `/api/announcements/:id` | ✅ | Admin | Partial update |
| 5 | `DELETE` | `/api/announcements/:id` | ✅ | Admin | Hard delete |

---

## 4. Proof Upload on Completed Orders

### What Changed

Previously, the `POST /api/proofs/:id/confirm` endpoint would **change the order status to `PROOF_UPLOADED`** on every proof upload. This meant uploading a new proof on a `COMPLETED` order would regress its status.

### New Behavior

- If the order is in `IN_PROGRESS` status → status changes to `PROOF_UPLOADED` (as before)
- If the order is already `COMPLETED` → **status stays `COMPLETED`** (no regression)
- The admin UI now shows the "Upload Proof" button for both `IN_PROGRESS` and `COMPLETED` orders

This allows admins to **add additional proof files** after an order is completed without affecting the order status.

### Updated Order Quick Reference

| # | Method | Endpoint | Auth | Role | Description |
|---|--------|----------|------|------|-------------|
| 1 | `GET` | `/api/orders` | ✅ | User | List own orders (paginated) |
| 2 | `GET` | `/api/orders/:id` | ✅ | User/Admin | Get order + docs + scheme |
| 3 | `GET` | `/api/orders/:id/receipt` | ✅ | User/Admin | Signed PDF receipt URL |
| 4 | `PATCH` | `/api/orders/:id/status` | ✅ | Admin | Update order status |
| 5 | `POST` | `/api/orders/:id/resubmit` | ✅ | User | Resubmit cancelled order |
| 6 | `GET` | `/api/orders/admin/queue` | ✅ | Admin | Admin orders queue |
| 7 | `POST` | `/api/orders/:id/complete` | ✅ | Admin | Mark as completed |
| 8 | `PATCH` | `/api/orders/:id/notes` | ✅ | Admin | **NEW** — Save admin notes |

---

## Route Registration

All new routes are registered in `apps/api/src/routes/index.ts`:

```typescript
import announcementRoutes from './announcement.routes.js';
import feedbackRoutes from './feedback.routes.js';

router.use('/announcements', announcementRoutes);
router.use('/feedbacks', feedbackRoutes);
// Order notes route is within order.routes.ts
```

---

*API Updates v1.1.0 — ShasanSeva*
