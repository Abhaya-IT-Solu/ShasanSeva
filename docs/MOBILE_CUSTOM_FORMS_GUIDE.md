# Custom Application Forms — Mobile Integration Guide

> **Base URL:** `https://api.shasanseva.in`
> **Auth:** All user endpoints require `Authorization: Bearer <jwt_token>` header.
> **Content-Type:** `application/json` for all requests unless otherwise noted.

---

## Overview

Some government schemes require applicants to fill in extra details before paying — things like college name, date of birth, category, or any scheme-specific field. These are called **custom form fields** and are defined per scheme by the development team.

**Your job as the mobile developer:**
1. Fetch the scheme details and check if `customFields` is non-empty.
2. If yes, render a dynamic form before the document upload step.
3. Collect the user's answers as a flat key-value map (`applicationFormData`).
4. Pass `applicationFormData` when creating the payment order.

The custom form data is then stored on the order and shown to admins in the order details view.

---

## Application Flow

```
Scheme Detail
     │
     ├── has customFields? ──YES──► Step 1: Custom Form (fill applicant details)
     │                                         │
     NO                                        ▼
     │                              Step 2: Document Upload
     └──────────────────────────────────────────┘
                                               │
                                               ▼
                                    Step 3: Review & Payment
                                    (pass applicationFormData in create-order)
                                               │
                                               ▼
                                    Step 4: Success
```

---

## Data Types

### `CustomFormField`

```typescript
interface CustomFormField {
  id: string;          // unique key, e.g. "college_name", "marks_10th"
  type: "text" | "number" | "date" | "select" | "textarea" | "email" | "phone";
  label: string;       // English label — always present
  label_mr?: string;   // Marathi label — show when locale is "mr"
  required: boolean;
  placeholder?: string;
  placeholder_mr?: string;
  options?: {          // only present when type === "select"
    label: string;
    label_mr?: string;
    value: string;     // this is what you store as the user's answer
  }[];
  validationRegex?: string; // optional, validate user input against this pattern
}
```

### `applicationFormData`

A flat JSON object mapping each field's `id` to the user's answer string:

```json
{
  "college_name": "Pune University",
  "marks_10th": "85",
  "category": "OBC",
  "dob": "2001-04-15"
}
```

---

## API Endpoints

### 1. Get Scheme Detail (includes customFields)

Fetch the full scheme object. `customFields` is included if the scheme has any.

```
GET /api/schemes/:slug?locale=en
GET /api/schemes/by-id/:id?locale=en
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Scholarship for OBC Students",
    "slug": "obc-scholarship",
    "description": "...",
    "category": "Education",
    "serviceFee": "499.00",
    "status": "ACTIVE",
    "requiredDocs": [
      {
        "type": "INCOME_CERTIFICATE",
        "label": "Income Certificate",
        "required": true,
        "description": "Certificate issued by Tahsildar"
      }
    ],
    "customFields": [
      {
        "id": "college_name",
        "type": "text",
        "label": "College / School Name",
        "label_mr": "महाविद्यालयाचे नाव",
        "required": true,
        "placeholder": "e.g. Government Polytechnic Pune"
      },
      {
        "id": "category",
        "type": "select",
        "label": "Caste Category",
        "label_mr": "जात प्रवर्ग",
        "required": true,
        "options": [
          { "label": "OBC", "label_mr": "इतर मागास", "value": "OBC" },
          { "label": "SC", "label_mr": "अनुसूचित जाती", "value": "SC" },
          { "label": "ST", "label_mr": "अनुसूचित जमाती", "value": "ST" }
        ]
      },
      {
        "id": "marks_10th",
        "type": "number",
        "label": "10th Grade Percentage",
        "label_mr": "दहावीची टक्केवारी",
        "required": true
      }
    ]
  }
}
```

**Logic:**
- If `data.customFields` is `undefined`, `null`, or an empty array `[]` → skip the custom form step, go straight to documents.
- If `data.customFields` has at least one field → show the custom form step first.

---

### 2. Create Payment Order (pass applicationFormData here)

After the user fills out the custom form and uploads documents, call this endpoint.

```
POST /api/payments/create-order
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "schemeId": "uuid-of-scheme",
  "applicationFormData": {
    "college_name": "Government Polytechnic Pune",
    "category": "OBC",
    "marks_10th": "87"
  }
}
```

`applicationFormData` is optional — send an empty object `{}` or omit if the scheme has no custom fields.

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "uuid",
    "razorpayOrderId": "order_xxxxx",
    "razorpayKeyId": "rzp_live_xxxxx",
    "amount": 49900,
    "currency": "INR",
    "schemeName": "Scholarship for OBC Students"
  }
}
```

> **Idempotency:** If a `PENDING_PAYMENT` order already exists for the same user + scheme, the API reuses it instead of creating a duplicate. It is safe to call this multiple times (e.g., if the user retries payment).

---

### 3. Upload Document (server-side proxy — avoids CORS issues)

Use this endpoint to upload documents. **Do NOT use pre-signed URL direct upload** — use this proxy endpoint instead to avoid cloud storage CORS errors.

```
POST /api/documents/upload
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "documentType": "INCOME_CERTIFICATE",
  "contentType": "application/pdf",
  "fileData": "<base64-encoded-file-contents>",
  "orderId": "uuid-of-order"
}
```

| Field | Required | Notes |
|---|---|---|
| `documentType` | Yes | The `type` string from `requiredDocs`, e.g. `"INCOME_CERTIFICATE"` |
| `contentType` | Yes | MIME type: `image/jpeg`, `image/png`, `image/webp`, or `application/pdf` |
| `fileData` | Yes | Base64-encoded binary of the file. Strip the `data:<mime>;base64,` prefix if you produce a Data URL. Max file size: **10 MB** |
| `orderId` | Conditional | Required if uploading after order creation (order detail page). Can be omitted if uploading before order creation (apply flow). |

**Response:**
```json
{
  "success": true,
  "data": {
    "documentId": "uuid-or-null",
    "key": "users/uuid/orders/uuid/INCOME_CERTIFICATE_1749123456789.pdf"
  }
}
```

- If `orderId` was provided, `documentId` is a UUID and the document is immediately linked to the order.
- If `orderId` was omitted, `documentId` is `null` and `key` should be saved client-side to pass in the verify step (see below).

**Base64 encoding example (Flutter/Dart):**
```dart
import 'dart:convert';
import 'dart:io';

Future<String> fileToBase64(File file) async {
  final bytes = await file.readAsBytes();
  return base64Encode(bytes);
}
```

---

### 4. Verify Payment (link documents uploaded before order creation)

After Razorpay payment completes, verify the payment and link any documents that were uploaded without an `orderId`.

```
POST /api/payments/verify
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "razorpayOrderId": "order_xxxxx",
  "razorpayPaymentId": "pay_xxxxx",
  "razorpaySignature": "hmac_sha256_signature",
  "orderId": "uuid",
  "documents": [
    { "docType": "INCOME_CERTIFICATE", "fileKey": "users/uuid/documents/INCOME_CERTIFICATE_..." },
    { "docType": "PHOTO", "fileKey": "users/uuid/documents/PHOTO_..." }
  ]
}
```

`documents` array is optional — pass it only if documents were uploaded **before** order creation (no `orderId` at upload time). Each item needs the `key` returned from the `/api/documents/upload` response.

If documents were uploaded **with** an `orderId` (after order creation, on the order detail page), they are already linked — omit them from this request.

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "uuid",
    "status": "PAID",
    "message": "Payment successful! Your application is now being processed."
  }
}
```

---

### 5. Get Order Details (shows applicationFormData + documents)

```
GET /api/orders/:id
Authorization: Bearer <token>
```

**Response (relevant fields):**
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "uuid",
      "status": "PAID",
      "paymentAmount": "499.00",
      "applicationFormData": {
        "college_name": "Government Polytechnic Pune",
        "category": "OBC",
        "marks_10th": "87"
      },
      "scheme": {
        "id": "uuid",
        "name": "Scholarship for OBC Students",
        "slug": "obc-scholarship",
        "customFields": [
          {
            "id": "college_name",
            "type": "text",
            "label": "College / School Name",
            "label_mr": "महाविद्यालयाचे नाव",
            "required": true
          }
        ],
        "requiredDocs": [...]
      }
    },
    "documents": [
      {
        "id": "uuid",
        "docType": "INCOME_CERTIFICATE",
        "status": "UPLOADED",
        "uploadedAt": "2025-06-23T10:00:00Z"
      }
    ]
  }
}
```

To display form answers with readable labels in the order detail screen:
- Iterate over `applicationFormData` entries.
- For each key, look up the matching `customFields` item where `field.id === key`.
- Display `field.label` (or `field.label_mr` for Marathi) as the row label.
- Display the raw value as the answer.

---

## Rendering Custom Fields — Field Type Reference

| `type` | Widget to use | Notes |
|---|---|---|
| `text` | Single-line text field | Use `placeholder` as hint |
| `textarea` | Multi-line text field | Use `placeholder` as hint |
| `number` | Number keyboard text field | Store answer as string `"85"` |
| `date` | Date picker | Store as `"YYYY-MM-DD"` string |
| `email` | Email keyboard text field | Apply email validation |
| `phone` | Phone keyboard text field | 10-digit Indian number |
| `select` | Dropdown / bottom sheet picker | Display `option.label` to user; store `option.value` |

**Validation:**
- `required: true` → block submission if field is empty.
- `validationRegex` (if present) → validate the user's input against the regex before submission. Example: `"^[0-9]{10}$"` for a 10-digit number.

**Language:**
- Show `label` by default (English).
- When the user's locale is Marathi (`mr`), prefer `label_mr` (if present) over `label`. Same for `placeholder_mr` and `option.label_mr`.

---

## End-to-End Flow (Apply Page)

```
1. GET /api/schemes/:slug
   └── If customFields.length > 0 → show custom form screen
       └── Collect answers into { fieldId: value } map

2. Show document upload screen
   └── For each required doc the user selects:
       POST /api/documents/upload
       { documentType, contentType, fileData (base64) }
       ← save returned { key } for later

3. Show review screen (display collected form answers + uploaded docs)

4. User taps "Pay"
   POST /api/payments/create-order
   { schemeId, applicationFormData }
   ← get orderId, razorpayOrderId, amount

5. Open Razorpay SDK with razorpayOrderId

6. On payment success:
   POST /api/payments/verify
   { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId,
     documents: [{ docType, fileKey }]  ← pass keys from step 2
   }

7. Navigate to success / order detail screen
```

---

## Error Handling

| HTTP status | Meaning |
|---|---|
| `400` | Validation error — check `error.message` |
| `401` | Token expired or missing — redirect to login |
| `403` | User does not own this order |
| `404` | Scheme or order not found |
| `413` | File too large — max 10 MB per document |
| `500` | Server error — show generic retry message |

All error responses follow the standard envelope:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message"
  }
}
```

---

## Allowed Document MIME Types

```
image/jpeg
image/png
image/webp
application/pdf
```

Maximum file size: **10 MB per file** (enforced server-side; returns HTTP 413 if exceeded).

---

## Notes for Developers

- **Pre-fill from profile:** On the custom form screen, pre-populate fields using the user's existing profile data (fetched from `GET /api/users/profile` — `profileData` field). The API also auto-merges `applicationFormData` into the user's profile on every order creation, so repeat applicants see their details filled in.
- **Order re-use:** Calling `POST /api/payments/create-order` a second time for the same scheme reuses the existing `PENDING_PAYMENT` order. Do not try to create a new order for a retry; just re-open the Razorpay SDK with the returned `razorpayOrderId`.
- **Document visibility:** Documents uploaded with an `orderId` appear immediately in `GET /api/orders/:id`. Documents uploaded without `orderId` (during the apply flow) only appear after the payment is verified via `POST /api/payments/verify`.
