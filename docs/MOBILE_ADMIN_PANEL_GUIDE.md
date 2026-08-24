# Order Management Changes — Mobile Admin Integration Guide

> **Base URL:** `https://api.shasanseva.in`
> **Auth:** All endpoints below require `Authorization: Bearer <jwt_token>` from an **admin** login.
> **Content-Type:** `application/json` for all requests.
> **Date:** August 2026 · Supersedes the order-management API tables in `mobile-app-requirements.md` §5.3–5.4

---

## Overview

The web admin panel's order management was rebuilt. The mobile admin app consumes the same endpoints, so it needs matching changes. Nothing about login or role handling changed — see `MOBILE_AUTH_GUIDE.md` §4 for that; it is still one `POST /api/auth/login` that branches on `userType`.

**Your job as the mobile developer:**
1. **Fix the cancel flow first.** `PATCH /api/orders/:id/status` with `CANCELLED` now **requires a reason**. Without this change, cancelling an order from the app fails with a 400.
2. Add the two new order statuses to your queue filter and status badge mapping.
3. Add search to the order queue.
4. Render the new order timeline, and respect the `visibility` flag on notes.
5. Show the applicant's note on the order detail screen.

> ⚠️ **Item 1 is a breaking change.** Ship it before or with the next app release, or admin cancellation breaks in production.

---

## 1. BREAKING — cancelling requires a reason

`PATCH /api/orders/:id/status`

Previously the web panel sent whatever text happened to be in its notes box on every transition, so cancelling without typing showed the applicant a stale note from an earlier cycle as their "cancellation reason". The server now rejects a reasonless cancellation.

**Request — cancelling:**
```json
{
  "status": "CANCELLED",
  "adminNotes": "आधार कार्डाची प्रत अस्पष्ट आहे — कृपया स्पष्ट प्रत पुन्हा अपलोड करा."
}
```

**Rules:**

| Field | When cancelling | Other transitions |
|---|---|---|
| `status` | required | required |
| `adminNotes` | **required, min 5 characters** | optional |

If `adminNotes` is missing or shorter than 5 characters:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "A reason of at least 5 characters is required to cancel an order"
  }
}
```

**What to build:** a reason prompt on the cancel action, with the same minimum-length validation client-side so the admin gets the message before the round trip. The reason is shown to the applicant and is what they act on when resubmitting — treat it as user-facing copy, not an internal note.

> **A note sent with a transition is always user-visible.** For private observations use `PATCH /:id/notes` with `visibility: "ADMIN_ONLY"` (§4).

---

## 2. Two new order statuses

`PENDING_PAYMENT` and `PAYMENT_FAILED` were always real values in the database but the queue endpoint rejected them as filters, and clients did not map them.

`GET /api/orders/admin/queue?status=PENDING_PAYMENT` returns `200` now — it used to return `400`.

**Full status list:**

| Status | Meaning | Admin action available |
|---|---|---|
| `PENDING_PAYMENT` | Created, not paid | none |
| `PAYMENT_FAILED` | Payment attempt failed | none |
| `PAID` | Paid, unassigned | pick up |
| `IN_PROGRESS` | Assigned and being worked | upload proof, complete, cancel |
| `PROOF_UPLOADED` | Proof attached | complete, cancel |
| `COMPLETED` | Finished | none |
| `CANCELLED` | Cancelled with a reason | none |

**What to build:** add both to your status enum, give them badge colours, and make sure your actions area renders an empty/placeholder state rather than nothing for the four statuses with no action. Keep an "All" filter that sends no `status` param — it returns literally all orders, including unpaid ones.

---

## 3. Order queue search

`GET /api/orders/admin/queue`

| Param | Type | Notes |
|---|---|---|
| `status` | enum | Any status from §2. Omit for all. |
| `search` | string, max 100 | **New.** Matches user name, user phone, scheme name, or order id |
| `page` | number | Default 1 |
| `limit` | number | Default 20, max 100 |

`search` is matched case-insensitively and as a partial, and combines with `status`.

```
GET /api/orders/admin/queue?status=PAID&search=9876
```

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "8a6b341b-11b9-447c-84b0-532b568f347f",
        "userId": "c86c10f4-eca6-4ca5-b3dc-5989ae7a4551",
        "userName": "सुनील पाटील",
        "userPhone": "9876543210",
        "schemeId": "b59b6dc8-7281-460b-b389-91b26ae5f900",
        "schemeName": "Ladaki Bahin Yojana",
        "paymentAmount": "399.00",
        "status": "PAID",
        "createdAt": "2026-08-22T13:03:30.000Z",
        "paymentTimestamp": "2026-08-22T13:03:57.000Z",
        "assignedTo": null
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 3, "totalPages": 1 }
  }
}
```

> **Search server-side, not client-side.** The queue paginates in SQL, so filtering the current page would silently miss matches on every other page.

---

## 4. Notes now have visibility

`PATCH /api/orders/:id/notes`

Every admin note used to be rendered verbatim on the applicant's order page, so there was no way to record an internal observation. Notes are now explicit about who sees them, and each one **appends to the order timeline** rather than overwriting a single field.

**Request:**
```json
{
  "adminNotes": "Called the applicant — they will re-upload by Friday.",
  "visibility": "ADMIN_ONLY"
}
```

| Field | Type | Notes |
|---|---|---|
| `adminNotes` | string, 1–2000 | required |
| `visibility` | `ADMIN_ONLY` \| `USER_VISIBLE` | **defaults to `ADMIN_ONLY`** |

**What to build:** a visibility toggle next to the note composer, defaulting to internal. Do not prefill the composer with the existing note — it adds a new entry, it does not edit the old one.

> **Assignment is now enforced here.** A non-`SUPER_ADMIN` admin gets `403` if the order is assigned to someone else. Previously any admin could overwrite any order's notes.

---

## 5. Order timeline

`GET /api/orders/:id/events` — **new endpoint.**

The order's full history. Admins receive every entry; the applicant receives only `USER_VISIBLE` ones (filtered server-side — you do not need to filter, but never render an `ADMIN_ONLY` entry in a user-facing screen if you share code between the two apps).

```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "3f2a...",
        "eventType": "RESUBMITTED",
        "fromStatus": "CANCELLED",
        "toStatus": "PAID",
        "actorType": "USER",
        "actorName": "सुनील पाटील",
        "visibility": "USER_VISIBLE",
        "message": null,
        "metadata": {
          "clearedAdminNote": "Aadhaar copy was unreadable",
          "removedDocuments": [{ "docType": "AADHAAR", "reason": "Blurred scan" }]
        },
        "createdAt": "2026-08-23T09:14:02.000Z"
      }
    ],
    "resubmissionCount": 1
  }
}
```

**Event types:**

| `eventType` | Emitted when | Typical `visibility` |
|---|---|---|
| `CREATED` | Order created | USER_VISIBLE |
| `PAYMENT_SUCCEEDED` | Payment captured | USER_VISIBLE |
| `STATUS_CHANGED` | Any status transition — read `fromStatus`/`toStatus` | USER_VISIBLE |
| `ADMIN_NOTE` | Admin added a note | either — check the field |
| `USER_NOTE` | Applicant added a note | USER_VISIBLE |
| `DOCUMENT_REJECTED` | Document rejected | USER_VISIBLE |
| `RESUBMITTED` | Applicant resubmitted | USER_VISIBLE |

`PAYMENT_FAILED`, `DOCUMENT_VERIFIED` and `PROOF_UPLOADED` exist in the type but are **not emitted yet**. Handle unknown `eventType` values gracefully — fall back to `message` or hide the row — so the app does not need a release when they start appearing.

There is no separate `PICKED_UP` or `COMPLETED` type — those are `STATUS_CHANGED` with `fromStatus`/`toStatus` set. Render from those two fields.

```dart
String describe(Map<String, dynamic> e) {
  switch (e['eventType']) {
    case 'STATUS_CHANGED':
      return '${e['fromStatus']} → ${e['toStatus']}';
    case 'ADMIN_NOTE':
      final private = e['visibility'] == 'ADMIN_ONLY';
      return '${private ? "Internal note" : "Note to applicant"}: ${e['message']}';
    default:
      return e['message'] ?? e['eventType'];
  }
}
```

> **`resubmissionCount` is derived, not stored.** It is the number of `RESUBMITTED` events. Use the value the endpoint returns; do not expect a field on the order object.

> **Timelines start at the deploy.** Orders created before this shipped have no history — show an empty state rather than treating it as an error.

---

## 6. The applicant's note

Applicants can now attach a free-text note when applying and add more afterwards. Two places it appears:

- `order.userNotes` on `GET /api/orders/:id` — the most recent note
- `USER_NOTE` entries in the timeline — the full history

**What to build:** show `userNotes` on the admin order detail screen, near the application form details. A note the officer never sees is worse than no note.

The applicant-side endpoint, if your user app also needs it:

`PATCH /api/orders/:id/user-note` — body `{ "note": "..." }`, owner only, rejected once the order is `COMPLETED`, capped at 20 notes per order.

---

## 7. Unchanged

These behave exactly as before — no client changes needed:

- `POST /api/auth/login` and admin role handling (`MOBILE_AUTH_GUIDE.md`)
- `GET /api/orders/:id` — same shape, plus the new `userNotes`, `completedAt` and `cancelledAt` fields
- `POST /api/orders/:id/complete`
- `PATCH /api/documents/:id/verify` and `/reject`
- Proof upload endpoints
- `GET /api/admin/stats`

> `completedAt` and `cancelledAt` are new on the order object and are populated going forward. Orders completed before this shipped have `null` — fall back to `updatedAt` if you show a completion date.

---

## Error Handling

| HTTP status | Meaning |
|---|---|
| `400` | Validation error — check `error.message`. **Cancelling without a reason lands here.** |
| `401` | Token expired or missing — redirect to login |
| `403` | Not an admin, or the order is assigned to another admin |
| `404` | Order not found |
| `500` | Server error — show generic retry message |

All error responses follow the standard envelope:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "A reason of at least 5 characters is required to cancel an order"
  }
}
```

---

## Notes for Developers

- **Ship the cancel-reason change first.** It is the only breaking item; everything else is additive and can follow at your own pace.
- **Default note visibility to internal.** Getting this backwards leaks staff observations to applicants, which is worse than the previous behaviour.
- **Do not compute the resubmission count yourself** from status history — resubmissions are only reliably recorded as `RESUBMITTED` events.

*API Guide v1.0 — ShasanSeva Mobile Admin Panel*
