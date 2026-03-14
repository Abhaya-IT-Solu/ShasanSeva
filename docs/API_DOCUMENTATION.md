# ShasanSeva API Documentation

> **Version:** 1.0.0  
> **Base URL:** `https://your-api-domain.com/api`  
> **Last Updated:** March 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Response Format](#response-format)
4. [Error Codes](#error-codes)
5. [API Endpoints](#api-endpoints)
   - [Auth](#auth-endpoints)
   - [User Profile](#user-profile-endpoints)
   - [Schemes](#scheme-endpoints)
   - [Orders](#order-endpoints)
     - [1. List User Orders](#1-list-user-orders)
     - [2. Get Order Details](#2-get-order-details)
     - [3. Get Order Receipt](#3-get-order-receipt)
     - [4. Update Order Status (Admin)](#4-update-order-status-admin)
     - [5. Resubmit Order (User)](#5-resubmit-order-user)
     - [6. Admin Orders Queue](#6-admin-orders-queue)
     - [7. Complete Order (Admin)](#7-complete-order-admin)
     - [Frontend Apply Flow Integration Guide](#frontend-apply-flow-integration-guide)
   - [Documents](#document-endpoints)
   - [Payments](#payment-endpoints)
6. [Important Notes for Mobile Developers](#important-notes-for-mobile-developers)
7. [Localization](#localization)

---

## Overview

ShasanSeva is a government scheme application platform that allows users to:
- Browse government schemes
- Apply for schemes by uploading required documents
- Make payments via Razorpay
- Track application status

---

## Authentication

All authenticated endpoints require a **Bearer token** in the `Authorization` header:

```
Authorization: Bearer <JWT_TOKEN>
```

### User Types
| Type | Description |
|------|-------------|
| `USER` | Regular users who apply for schemes |
| `ADMIN` | Admin users who process applications |

---

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  }
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `UNAUTHORIZED` | 401 | Missing or invalid auth token |
| `FORBIDDEN` | 403 | Access denied |
| `NOT_FOUND` | 404 | Resource not found |
| `INTERNAL_ERROR` | 500 | Server error |

---

## API Endpoints

---

### Auth Endpoints

#### `POST /api/auth/register`
Register a new user with phone number and password.

**Body:**
```json
{
  "phone": "9876543210",
  "password": "password123",
  "name": "John Doe"  // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhb...",
    "user": {
      "id": "uuid",
      "phone": "9876543210",
      "name": "John Doe"
    },
    "userType": "USER"
  }
}
```

**Validation Rules:**
- `phone`: Must be a valid 10-digit Indian phone number starting with 6-9
- `password`: Minimum 8 characters

---

#### `POST /api/auth/login`
Login with phone and password. Works for both users and admins.

**Body:**
```json
{
  "phone": "9876543210",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhb...",
    "user": {
      "id": "uuid",
      "phone": "9876543210",
      "name": "John Doe",
      "profileComplete": true
    },
    "userType": "USER"  // or "ADMIN"
  }
}
```

---

#### `GET /api/auth/me`
Get current authenticated user profile.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "userType": "USER",
    "role": null,
    "phone": "9876543210",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

---

#### `POST /api/auth/logout`
Invalidate current session.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

---

#### `POST /api/auth/change-password`
Change password for authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "currentPassword": "oldPassword",
  "newPassword": "newPassword123"
}
```

---

#### `GET /api/auth/google`
Initiates Google OAuth flow. **Web only - redirects to Google consent screen.**

---

### User Profile Endpoints

#### `GET /api/users/profile`
Get full profile of current user.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "phone": "9876543210",
    "email": "user@example.com",
    "name": "John Doe",
    "category": "STUDENT",
    "address": {
      "line1": "123 Main St",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001"
    },
    "profileComplete": true,
    "createdAt": "2026-01-15T10:30:00Z"
  }
}
```

---

#### `PATCH /api/users/profile`
Update user profile.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "name": "John Doe Updated",
  "email": "newemail@example.com",
  "category": "FARMER",
  "address": {
    "line1": "456 New St",
    "city": "Pune",
    "state": "Maharashtra",
    "pincode": "411001"
  }
}
```

**Category Options:** `STUDENT`, `FARMER`, `LOAN_CANDIDATE`, `OTHER`

> ⚠️ **Important:** After OAuth login, check if `profileComplete` is `false`. If so, prompt the user to complete their profile.

---

### Scheme Endpoints

> **Caching:** Public scheme endpoints use **Redis caching** for performance. Admin mutations (`POST`, `PATCH`, `DELETE`) automatically invalidate the cache.  
> **Internationalization:** Scheme content supports **English (`en`)** and **Marathi (`mr`)** translations via a dedicated `scheme_translations` table.

---

#### Scheme Database Model

##### `schemes` Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | **PK**, auto-generated | Unique scheme identifier |
| `name` | `varchar(255)` | NOT NULL | Scheme name (English, legacy field) |
| `slug` | `varchar(255)` | UNIQUE, NOT NULL | URL-friendly identifier (e.g., `scholarship-program`) |
| `description` | `text` | nullable | Scheme description (English, legacy field) |
| `category` | `varchar(50)` | nullable | Scheme category |
| `schemeType` | `varchar(50)` | nullable | `GOVERNMENT` or `PRIVATE` |
| `eligibility` | `text` | nullable | Eligibility criteria (English, legacy field) |
| `benefits` | `text` | nullable | Scheme benefits (English, legacy field) |
| `requiredDocs` | `jsonb` | default `[]` | Array of required documents (see structure below) |
| `serviceFee` | `decimal(10,2)` | NOT NULL | Service fee in INR (e.g., `199.00`) |
| `status` | `varchar(20)` | default `ACTIVE` | `ACTIVE` or `INACTIVE` |
| `createdBy` | `uuid` | **FK → admins.id**, nullable | Admin who created the scheme |
| `createdAt` | `timestamp` | NOT NULL, default `now()` | Creation timestamp |
| `updatedAt` | `timestamp` | NOT NULL, default `now()` | Last update timestamp |

##### `scheme_translations` Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | **PK**, auto-generated | Unique translation record ID |
| `schemeId` | `uuid` | **FK → schemes.id**, NOT NULL | Parent scheme |
| `locale` | `varchar(10)` | NOT NULL | Language code: `en` or `mr` |
| `name` | `varchar(255)` | NOT NULL | Translated scheme name |
| `description` | `text` | nullable | Translated description |
| `eligibility` | `text` | nullable | Translated eligibility text |
| `benefits` | `text` | nullable | Translated benefits text |
| `translatedAt` | `timestamp` | default `now()` | When translation was last updated |
| `translatedBy` | `uuid` | **FK → admins.id**, nullable | Admin who provided the translation |

---

#### Enums & Constants

##### Scheme Categories
| Value | Description |
|-------|-------------|
| `STUDENT` | Student scholarships & educational schemes |
| `FARMER` | Agricultural & farmer welfare schemes |
| `LOAN` | Loan assistance programs |
| `CERTIFICATE` | Important certificates (birth, caste, income, etc.) |
| `JOBS` | Jobs & employment assistance |
| `HEALTH` | Healthcare schemes |
| `OTHER` | Other government/private services |

##### Scheme Types
| Value | Description |
|-------|-------------|
| `GOVERNMENT` | Government-backed schemes |
| `PRIVATE` | Private service schemes |

##### Scheme Status
| Value | Description |
|-------|-------------|
| `ACTIVE` | Visible to public users, can be applied to |
| `INACTIVE` | Hidden from public, only visible to admins (soft delete) |

##### Supported Locales
| Code | Language |
|------|----------|
| `en` | English (default) |
| `mr` | Marathi (मराठी) |

---

#### Required Documents Structure

The `requiredDocs` field is a JSON array stored in the `schemes` table. Each element describes a document the user must upload when applying.

```typescript
interface RequiredDocument {
  type: string;           // Unique identifier: 'AADHAAR', 'PAN', 'INCOME_CERT', etc.
  label: string;          // English display name
  label_mr?: string;      // Marathi display name (optional)
  required: boolean;      // Whether this document is mandatory
  description?: string;   // English help text
  description_mr?: string; // Marathi help text (optional)
}
```

**Example:**
```json
[
  {
    "type": "AADHAAR",
    "label": "Aadhaar Card",
    "label_mr": "आधार कार्ड",
    "required": true,
    "description": "12-digit Aadhaar number with clear photo",
    "description_mr": "स्पष्ट फोटोसह 12-अंकी आधार क्रमांक"
  },
  {
    "type": "PAN_CARD",
    "label": "PAN Card",
    "label_mr": "पॅन कार्ड",
    "required": true,
    "description": "Permanent Account Number card"
  },
  {
    "type": "INCOME_CERT",
    "label": "Income Certificate",
    "label_mr": "उत्पन्न प्रमाणपत्र",
    "required": false,
    "description": "Income certificate from Tehsildar office"
  }
]
```

> **Locale-aware:** When the public API is called with `locale=mr`, the `label` and `description` fields in `requiredDocs` are automatically replaced with their `_mr` counterparts if available.

---

### 1. List All Schemes (Public)

#### `GET /api/schemes`

Lists all active schemes. Supports filtering by category, scheme type, text search, and language. Public requests are **cached in Redis** for performance.

**Authentication:** Not required (public endpoint)  
**Admin behavior:** If an `Authorization` header is present, all schemes (including `INACTIVE`) are returned, and the response is **not cached**.

**Query Parameters:**

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `category` | `string` | No | — | Filter by category. One of: `STUDENT`, `FARMER`, `LOAN`, `CERTIFICATE`, `JOBS`, `HEALTH`, `OTHER` |
| `schemeType` | `string` | No | — | Filter by type: `GOVERNMENT` or `PRIVATE` |
| `status` | `string` | No | — | Filter by status: `ACTIVE` or `INACTIVE` (admin only, ignored for public) |
| `search` | `string` | No | — | Full-text search across translated `name` and `description` (case-insensitive) |
| `locale` | `string` | No | `en` | Language for translated content: `en` or `mr` |

**Example Requests:**
```
GET /api/schemes
GET /api/schemes?category=STUDENT&locale=mr
GET /api/schemes?schemeType=GOVERNMENT&search=scholarship
GET /api/schemes?category=FARMER&schemeType=GOVERNMENT&locale=en
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "slug": "scholarship-program",
      "category": "STUDENT",
      "schemeType": "GOVERNMENT",
      "serviceFee": "199.00",
      "status": "ACTIVE",
      "name": "Scholarship Program",
      "description": "Financial aid for meritorious students pursuing higher education"
    },
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "slug": "farmer-subsidy-scheme",
      "category": "FARMER",
      "schemeType": "GOVERNMENT",
      "serviceFee": "149.00",
      "status": "ACTIVE",
      "name": "Farmer Subsidy Scheme",
      "description": "Agricultural subsidies for small and marginal farmers"
    }
  ]
}
```

**Response Fields (per scheme):**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string (uuid)` | Unique scheme ID |
| `slug` | `string` | URL-friendly identifier |
| `category` | `string` | Scheme category |
| `schemeType` | `string` | `GOVERNMENT` or `PRIVATE` |
| `serviceFee` | `string` | Fee in INR (e.g., `"199.00"`) |
| `status` | `string` | `ACTIVE` or `INACTIVE` |
| `name` | `string \| null` | Translated scheme name (null if translation missing) |
| `description` | `string \| null` | Translated description (null if translation missing) |

**Error Responses:**

| Status | Code | Scenario |
|--------|------|----------|
| 400 | `VALIDATION_ERROR` | Invalid `category`, `schemeType`, `status`, or `locale` enum value |
| 500 | `INTERNAL_ERROR` | Database or Redis query failure |

**Caching Behavior:**
- Public requests (no auth header) without `search` or `status` filters are **cached in Redis**
- Cache key pattern: `schemes:list:{locale}:{category}`
- Admin requests are **never cached**
- Search queries are **never cached** (filtered in-memory)
- Cache is automatically invalidated on create/update/delete operations

---

### 2. Get Scheme by Slug (Public)

#### `GET /api/schemes/:slug`

Retrieves full scheme details including translated content, eligibility, benefits, and required documents. This is the primary endpoint for the scheme detail page.

**Authentication:** Not required (public endpoint)  
**Admin behavior:** If an `Authorization` header is present, `INACTIVE` schemes are also returned.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `slug` | `string` | Yes | URL-friendly scheme identifier (e.g., `scholarship-program`) |

**Query Parameters:**

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `locale` | `string` | No | `en` | Language for translated content: `en` or `mr` |

**Example Requests:**
```
GET /api/schemes/scholarship-program
GET /api/schemes/scholarship-program?locale=mr
```

**Success Response (200 OK) — English:**
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "slug": "scholarship-program",
    "category": "STUDENT",
    "schemeType": "GOVERNMENT",
    "serviceFee": "199.00",
    "status": "ACTIVE",
    "name": "Scholarship Program",
    "description": "Financial aid for meritorious students pursuing higher education",
    "eligibility": "Students with 60% or above marks in previous examination",
    "benefits": "Up to ₹50,000 scholarship per year",
    "requiredDocs": [
      {
        "type": "AADHAAR",
        "label": "Aadhaar Card",
        "description": "12-digit Aadhaar number with clear photo",
        "required": true
      },
      {
        "type": "MARKSHEET",
        "label": "Previous Year Marksheet",
        "description": "Attested copy of marksheet",
        "required": true
      },
      {
        "type": "INCOME_CERT",
        "label": "Income Certificate",
        "description": "Family income certificate from Tehsildar",
        "required": false
      }
    ]
  }
}
```

**Success Response (200 OK) — Marathi (`locale=mr`):**
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "slug": "scholarship-program",
    "category": "STUDENT",
    "schemeType": "GOVERNMENT",
    "serviceFee": "199.00",
    "status": "ACTIVE",
    "name": "शिष्यवृत्ती कार्यक्रम",
    "description": "उच्च शिक्षण घेत असलेल्या गुणवंत विद्यार्थ्यांसाठी आर्थिक मदत",
    "eligibility": "मागील परीक्षेत ६०% किंवा त्याहून अधिक गुण असलेले विद्यार्थी",
    "benefits": "दरवर्षी ₹५०,००० पर्यंत शिष्यवृत्ती",
    "requiredDocs": [
      {
        "type": "AADHAAR",
        "label": "आधार कार्ड",
        "description": "स्पष्ट फोटोसह 12-अंकी आधार क्रमांक",
        "required": true
      },
      {
        "type": "MARKSHEET",
        "label": "Previous Year Marksheet",
        "description": "Attested copy of marksheet",
        "required": true
      }
    ]
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string (uuid)` | Unique scheme ID |
| `slug` | `string` | URL-friendly identifier |
| `category` | `string` | Scheme category |
| `schemeType` | `string` | `GOVERNMENT` or `PRIVATE` |
| `serviceFee` | `string` | Service fee in INR |
| `status` | `string` | `ACTIVE` or `INACTIVE` |
| `name` | `string \| null` | Translated name |
| `description` | `string \| null` | Translated description |
| `eligibility` | `string \| null` | Translated eligibility criteria |
| `benefits` | `string \| null` | Translated benefits info |
| `requiredDocs` | `RequiredDocument[]` | List of required documents (locale-aware labels) |

> **Translation Fallback:** When `locale=mr` is specified, the `requiredDocs[].label` and `requiredDocs[].description` fields are replaced with their `_mr` variants if available. If no Marathi translation exists, English values are returned.

**Error Responses:**

| Status | Code | Scenario |
|--------|------|----------|
| 404 | `NOT_FOUND` | No scheme with this slug exists, or scheme is `INACTIVE` and requester is not an admin |
| 500 | `INTERNAL_ERROR` | Database or Redis query failure |

**Caching Behavior:**
- Public requests for `ACTIVE` schemes are cached in Redis
- Cache key pattern: `schemes:detail:{slug}:{locale}`
- Admin requests are never cached

---

### 3. Get Scheme by ID (Admin)

#### `GET /api/schemes/by-id/:id`

Retrieves scheme details by UUID, including **all translations** (not just the requested locale). Primarily used by the admin panel for editing schemes.

**Authentication:** Not strictly enforced (no middleware), but intended for admin use

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string (uuid)` | Yes | Scheme UUID |

**Example Request:**
```
GET /api/schemes/by-id/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "slug": "scholarship-program",
    "category": "STUDENT",
    "schemeType": "GOVERNMENT",
    "serviceFee": "199.00",
    "status": "ACTIVE",
    "requiredDocs": [
      {
        "type": "AADHAAR",
        "label": "Aadhaar Card",
        "label_mr": "आधार कार्ड",
        "required": true,
        "description": "12-digit Aadhaar number",
        "description_mr": "12-अंकी आधार क्रमांक"
      }
    ],
    "translations": {
      "en": {
        "name": "Scholarship Program",
        "description": "Financial aid for meritorious students",
        "eligibility": "Students with 60% marks",
        "benefits": "Up to ₹50,000 scholarship"
      },
      "mr": {
        "name": "शिष्यवृत्ती कार्यक्रम",
        "description": "गुणवंत विद्यार्थ्यांसाठी आर्थिक मदत",
        "eligibility": "६०% गुण असलेले विद्यार्थी",
        "benefits": "₹५०,००० पर्यंत शिष्यवृत्ती"
      }
    }
  }
}
```

**Key Difference from `GET /:slug`:**
- Returns **all translations** grouped by locale (not just one locale)
- Returns `requiredDocs` with **both** English and Marathi labels (`label` + `label_mr`)
- Returns `INACTIVE` schemes without restriction
- **Not cached** in Redis

**Error Responses:**

| Status | Code | Scenario |
|--------|------|----------|
| 404 | `NOT_FOUND` | No scheme with this UUID exists |
| 500 | `INTERNAL_ERROR` | Database query failure |

> **Legacy Fallback:** If no translations exist in the `scheme_translations` table, the endpoint falls back to the legacy `name`, `description`, `eligibility`, and `benefits` fields from the `schemes` table and returns them under `translations.en`.

---

### 4. Create Scheme (Admin Only)

#### `POST /api/schemes`

Creates a new scheme with translations. Automatically invalidates the Redis cache.

**Authentication:** Required (**Admin only** — `authMiddleware` + `adminMiddleware`)

**Headers:**
```
Authorization: Bearer <ADMIN_JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `slug` | `string` | **Yes** | 3-255 chars, lowercase alphanumeric + hyphens only, regex: `/^[a-z0-9-]+$/` | URL-friendly unique identifier |
| `category` | `string` | **Yes** | Enum: `STUDENT`, `FARMER`, `LOAN`, `CERTIFICATE`, `JOBS`, `HEALTH`, `OTHER` | Scheme category |
| `schemeType` | `string` | **Yes** | Enum: `GOVERNMENT`, `PRIVATE` | Scheme type |
| `serviceFee` | `string` | **Yes** | Regex: `/^\d+(\.\d{1,2})?$/` (e.g., `"199"`, `"199.00"`, `"99.50"`) | Service fee in INR |
| `status` | `string` | No | Enum: `ACTIVE`, `INACTIVE`. Default: `ACTIVE` | Initial scheme status |
| `requiredDocs` | `array` | No | Default: `[]` | Array of required document definitions |
| `translations` | `object` | **Yes** | Must include `en`, optional `mr` | Localized content (see below) |

**`translations` Object:**

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `translations.en` | `object` | **Yes** | — | English translation (required) |
| `translations.en.name` | `string` | **Yes** | 1-255 characters | Scheme name in English |
| `translations.en.description` | `string` | No | — | Description in English |
| `translations.en.eligibility` | `string` | No | — | Eligibility criteria in English |
| `translations.en.benefits` | `string` | No | — | Benefits in English |
| `translations.mr` | `object` | No | — | Marathi translation (optional) |
| `translations.mr.name` | `string` | **Yes** (if `mr` provided) | 1-255 characters | Scheme name in Marathi |
| `translations.mr.description` | `string` | No | — | Description in Marathi |
| `translations.mr.eligibility` | `string` | No | — | Eligibility in Marathi |
| `translations.mr.benefits` | `string` | No | — | Benefits in Marathi |

**`requiredDocs[]` Items:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `string` | **Yes** | Document type identifier (e.g., `AADHAAR`, `PAN_CARD`) |
| `label` | `string` | **Yes** | English display name |
| `label_mr` | `string` | No | Marathi display name |
| `required` | `boolean` | **Yes** | Whether this document is mandatory |
| `description` | `string` | No | English help/description text |
| `description_mr` | `string` | No | Marathi help/description text |

**Full Request Body Example:**
```json
{
  "slug": "scholarship-program",
  "category": "STUDENT",
  "schemeType": "GOVERNMENT",
  "serviceFee": "199.00",
  "status": "ACTIVE",
  "requiredDocs": [
    {
      "type": "AADHAAR",
      "label": "Aadhaar Card",
      "label_mr": "आधार कार्ड",
      "required": true,
      "description": "12-digit Aadhaar number with clear photo",
      "description_mr": "स्पष्ट फोटोसह 12-अंकी आधार क्रमांक"
    },
    {
      "type": "MARKSHEET",
      "label": "Previous Year Marksheet",
      "label_mr": "मागील वर्षाची गुणपत्रिका",
      "required": true
    }
  ],
  "translations": {
    "en": {
      "name": "Scholarship Program",
      "description": "Financial aid for meritorious students pursuing higher education",
      "eligibility": "Students with 60% or above marks in previous examination",
      "benefits": "Up to ₹50,000 scholarship per year"
    },
    "mr": {
      "name": "शिष्यवृत्ती कार्यक्रम",
      "description": "उच्च शिक्षण घेत असलेल्या गुणवंत विद्यार्थ्यांसाठी आर्थिक मदत",
      "eligibility": "मागील परीक्षेत ६०% किंवा त्याहून अधिक गुण असलेले विद्यार्थी",
      "benefits": "दरवर्षी ₹५०,००० पर्यंत शिष्यवृत्ती"
    }
  }
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "slug": "scholarship-program",
    "name": "Scholarship Program",
    "description": "Financial aid for meritorious students pursuing higher education",
    "category": "STUDENT",
    "schemeType": "GOVERNMENT",
    "eligibility": "Students with 60% or above marks in previous examination",
    "benefits": "Up to ₹50,000 scholarship per year",
    "requiredDocs": [ ... ],
    "serviceFee": "199.00",
    "status": "ACTIVE",
    "createdBy": "admin-uuid",
    "createdAt": "2026-03-10T06:00:00.000Z",
    "updatedAt": "2026-03-10T06:00:00.000Z",
    "translations": {
      "en": { "name": "Scholarship Program", ... },
      "mr": { "name": "शिष्यवृत्ती कार्यक्रम", ... }
    }
  }
}
```

**Error Responses:**

| Status | Code | Scenario |
|--------|------|----------|
| 400 | `VALIDATION_ERROR` | Invalid slug format, duplicate slug, missing required fields, invalid enum values, invalid `serviceFee` format |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT token |
| 403 | `FORBIDDEN` | User is not an admin |
| 500 | `INTERNAL_ERROR` | Database insert failed |

**Slug Validation Error Example:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Slug must be lowercase alphanumeric with hyphens"
  }
}
```

**Duplicate Slug Error Example:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Scheme with this slug already exists"
  }
}
```

**Side Effects:**
- Inserts a row in `schemes` table (with English content in legacy fields)
- Inserts English translation in `scheme_translations` table
- Inserts Marathi translation in `scheme_translations` table (if provided)
- Invalidates all Redis scheme cache entries

---

### 5. Update Scheme (Admin Only)

#### `PATCH /api/schemes/:id`

Partially updates a scheme and its translations. All fields are optional — only provided fields are updated. Automatically invalidates the Redis cache.

**Authentication:** Required (**Admin only** — `authMiddleware` + `adminMiddleware`)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string (uuid)` | Yes | Scheme UUID to update |

**Headers:**
```
Authorization: Bearer <ADMIN_JWT_TOKEN>
Content-Type: application/json
```

**Request Body (all fields optional):**

| Field | Type | Validation | Description |
|-------|------|------------|-------------|
| `slug` | `string` | 3-255 chars, `/^[a-z0-9-]+$/`, must be unique | New URL slug |
| `category` | `string` | Enum values | New category |
| `schemeType` | `string` | `GOVERNMENT` or `PRIVATE` | New scheme type |
| `serviceFee` | `string` | `/^\d+(\.\d{1,2})?$/` | New service fee |
| `status` | `string` | `ACTIVE` or `INACTIVE` | New status |
| `requiredDocs` | `array` | Same structure as create | Replace entire required docs list |
| `translations` | `object` | `{ en?: {...}, mr?: {...} }` | Update specific translations |

**Example — Update only the service fee and status:**
```json
{
  "serviceFee": "249.00",
  "status": "ACTIVE"
}
```

**Example — Update Marathi translation only:**
```json
{
  "translations": {
    "mr": {
      "name": "शिष्यवृत्ती कार्यक्रम (अद्ययावत)",
      "description": "विद्यार्थ्यांसाठी सुधारित आर्थिक मदत योजना"
    }
  }
}
```

**Example — Full update:**
```json
{
  "slug": "updated-scholarship-program",
  "category": "STUDENT",
  "schemeType": "GOVERNMENT",
  "serviceFee": "299.00",
  "status": "ACTIVE",
  "requiredDocs": [
    {
      "type": "AADHAAR",
      "label": "Aadhaar Card",
      "label_mr": "आधार कार्ड",
      "required": true
    }
  ],
  "translations": {
    "en": {
      "name": "Updated Scholarship Program",
      "description": "Enhanced financial aid program"
    },
    "mr": {
      "name": "अद्ययावत शिष्यवृत्ती कार्यक्रम",
      "description": "वर्धित आर्थिक मदत कार्यक्रम"
    }
  }
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "slug": "updated-scholarship-program",
    "name": "Updated Scholarship Program",
    "description": "Enhanced financial aid program",
    "category": "STUDENT",
    "schemeType": "GOVERNMENT",
    "eligibility": "Students with 60% marks",
    "benefits": "Up to ₹50,000 scholarship",
    "requiredDocs": [ ... ],
    "serviceFee": "299.00",
    "status": "ACTIVE",
    "createdBy": "admin-uuid",
    "createdAt": "2026-03-10T06:00:00.000Z",
    "updatedAt": "2026-03-10T06:30:00.000Z"
  }
}
```

**Error Responses:**

| Status | Code | Scenario |
|--------|------|----------|
| 400 | `VALIDATION_ERROR` | Invalid slug format, duplicate slug, invalid enum values |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT token |
| 403 | `FORBIDDEN` | User is not an admin |
| 404 | `NOT_FOUND` | Scheme with given UUID does not exist |
| 500 | `INTERNAL_ERROR` | Database update failed |

**Side Effects:**
- Updates `schemes` table fields (including legacy English fields if `translations.en` is provided)
- Sets `updatedAt` to current timestamp
- Upserts translations: updates existing locale or inserts new if absent
- Invalidates all Redis scheme cache entries

> **Translation Upsert Logic:** If a translation for the given locale already exists, it is updated. If not (e.g., adding Marathi for the first time), a new translation record is inserted. The `name` field is required for new translations.

---

### 6. Delete Scheme (Admin Only) — Soft Delete

#### `DELETE /api/schemes/:id`

**Soft-deletes** a scheme by setting its status to `INACTIVE`. The scheme remains in the database but is hidden from public endpoints.

**Authentication:** Required (**Admin only** — `authMiddleware` + `adminMiddleware`)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string (uuid)` | Yes | Scheme UUID to deactivate |

**Headers:**
```
Authorization: Bearer <ADMIN_JWT_TOKEN>
```

**Request Body:** None

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Scheme deactivated successfully"
  }
}
```

**Error Responses:**

| Status | Code | Scenario |
|--------|------|----------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT token |
| 403 | `FORBIDDEN` | User is not an admin |
| 404 | `NOT_FOUND` | Scheme with given UUID does not exist |
| 500 | `INTERNAL_ERROR` | Database update failed |

**Side Effects:**
- Sets `status` → `INACTIVE`
- Sets `updatedAt` → current timestamp
- Invalidates all Redis scheme cache entries
- Scheme becomes invisible to public `GET /api/schemes` and `GET /api/schemes/:slug`

> **⚠️ Note:** This is a **soft delete**, not a hard delete. The scheme data, translations, and associated orders are all preserved. To reactivate, use `PATCH /api/schemes/:id` with `{ "status": "ACTIVE" }`.

---

### Scheme Endpoints Quick Reference

| # | Method | Endpoint | Auth | Role | Description |
|---|--------|----------|------|------|-------------|
| 1 | `GET` | `/api/schemes` | ❌ | Public | List schemes (cached, filterable) |
| 2 | `GET` | `/api/schemes/:slug` | ❌ | Public | Get scheme detail by slug (cached) |
| 3 | `GET` | `/api/schemes/by-id/:id` | ❌* | Admin use | Get scheme by UUID with all translations |
| 4 | `POST` | `/api/schemes` | ✅ | **Admin** | Create new scheme with translations |
| 5 | `PATCH` | `/api/schemes/:id` | ✅ | **Admin** | Update scheme fields/translations |
| 6 | `DELETE` | `/api/schemes/:id` | ✅ | **Admin** | Soft-delete (deactivate) scheme |

> \* Endpoint 3 has no auth middleware but is designed for admin panel use. It shows all data including `INACTIVE` schemes and raw translation objects.

---

### Scheme Integration Guide

#### Fetching Schemes for Display (Frontend / Mobile)

```javascript
// List all schemes in Marathi
const schemes = await fetch('/api/schemes?locale=mr');

// Filter by category
const studentSchemes = await fetch('/api/schemes?category=STUDENT&locale=en');

// Search schemes
const results = await fetch('/api/schemes?search=scholarship&locale=en');

// Get scheme detail for the apply page
const scheme = await fetch('/api/schemes/scholarship-program?locale=mr');

// Use requiredDocs to show document upload UI
const { requiredDocs } = scheme.data;
requiredDocs.forEach(doc => {
  // doc.type   → 'AADHAAR'
  // doc.label  → 'आधार कार्ड' (already in Marathi if locale=mr)
  // doc.required → true/false
});
```

#### Admin CRUD Operations

```javascript
// Create a new scheme
await api.post('/schemes', {
  slug: 'new-farmer-scheme',
  category: 'FARMER',
  schemeType: 'GOVERNMENT',
  serviceFee: '149.00',
  translations: {
    en: { name: 'Farmer Welfare Scheme', description: '...' },
    mr: { name: 'शेतकरी कल्याण योजना', description: '...' },
  },
  requiredDocs: [ ... ],
});

// Fetch scheme for edit form (returns ALL translations)
const scheme = await api.get('/schemes/by-id/a1b2c3d4-...');
// scheme.data.translations → { en: {...}, mr: {...} }

// Update specific fields
await api.patch('/schemes/a1b2c3d4-...', {
  serviceFee: '199.00',
  translations: { mr: { name: 'अद्ययावत शेतकरी योजना' } },
});

// Soft-delete (deactivate)
await api.delete('/schemes/a1b2c3d4-...');

// Reactivate
await api.patch('/schemes/a1b2c3d4-...', { status: 'ACTIVE' });
```

---

### Order Endpoints

> **Authentication:** All order endpoints require a valid JWT token via `Authorization: Bearer <token>`.

---

#### Order Status Lifecycle

Orders follow a strict status machine. Valid transitions are:

| From | Can Move To |
|------|------------|
| `PAID` | `IN_PROGRESS`, `CANCELLED` |
| `IN_PROGRESS` | `PROOF_UPLOADED`, `COMPLETED`, `CANCELLED` |
| `PROOF_UPLOADED` | `COMPLETED`, `CANCELLED` |
| `COMPLETED` | *(terminal)* |
| `CANCELLED` | *(terminal — user can resubmit)* |

```
PAID → IN_PROGRESS → PROOF_UPLOADED → COMPLETED
  ↓          ↓              ↓
CANCELLED  CANCELLED    CANCELLED
             ↑
    (resubmit resets to PAID)
```

---

### Order Endpoints Quick Reference

| # | Method | Endpoint | Auth | Role | Description |
|---|--------|----------|------|------|-------------|
| 1 | `GET` | `/api/orders` | ✅ | User | List own orders (paginated) |
| 2 | `GET` | `/api/orders/:id` | ✅ | User/Admin | Get order + documents + scheme |
| 3 | `GET` | `/api/orders/:id/receipt` | ✅ | User/Admin | Get signed PDF receipt download URL |
| 4 | `PATCH` | `/api/orders/:id/status` | ✅ | **Admin** | Update order status |
| 5 | `POST` | `/api/orders/:id/resubmit` | ✅ | User | Resubmit a cancelled order |
| 6 | `GET` | `/api/orders/admin/queue` | ✅ | **Admin** | View all orders queue (paginated) |
| 7 | `POST` | `/api/orders/:id/complete` | ✅ | **Admin** | Mark order as completed |

---

### 1. List User Orders

#### `GET /api/orders`

Returns the authenticated user's orders with scheme details. Supports pagination.

**Authentication:** Required (User)

**Query Parameters:**

| Param | Type | Required | Default | Constraints | Description |
|-------|------|----------|---------|-------------|-------------|
| `page` | `number` | No | `1` | Min: 1 | Page number |
| `limit` | `number` | No | `20` | Min: 10, Max: 100 | Results per page |

**Example Request:**
```
GET /api/orders?page=1&limit=20
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "e5f6a7b8-c9d0-1234-abcd-ef5678901234",
        "schemeId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "schemeName": "Scholarship Program",
        "schemeCategory": "STUDENT",
        "paymentAmount": "199.00",
        "status": "IN_PROGRESS",
        "createdAt": "2026-01-20T14:30:00.000Z",
        "paymentTimestamp": "2026-01-20T14:35:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

**Response Fields (per order):**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string (uuid)` | Order ID |
| `schemeId` | `string (uuid)` | Scheme the order is for |
| `schemeName` | `string \| null` | Scheme name (joined from `schemes` table) |
| `schemeCategory` | `string \| null` | Scheme category (e.g., `STUDENT`, `FARMER`) |
| `paymentAmount` | `string` | Amount paid in INR |
| `status` | `string` | Current order status |
| `createdAt` | `timestamp` | When the order was created |
| `paymentTimestamp` | `timestamp \| null` | When payment was completed |

**Error Responses:**

| Status | Code | Scenario |
|--------|------|----------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT token |
| 500 | `INTERNAL_ERROR` | Database query failure |

---

### 2. Get Order Details

#### `GET /api/orders/:id`

Returns detailed information about a specific order, including full scheme details and all associated documents.

**Authentication:** Required (User owns the order, or Admin)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string (uuid)` | Yes | Order UUID |

**Authorization Rules:**
- A regular `USER` can only view their **own** orders
- An `ADMIN` can view any order

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "e5f6a7b8-c9d0-1234-abcd-ef5678901234",
      "userId": "user-uuid",
      "schemeId": "scheme-uuid",
      "paymentAmount": "199.00",
      "status": "IN_PROGRESS",
      "assignedTo": "admin-uuid",
      "adminNotes": null,
      "receiptKey": "receipts/e5f6.../receipt.pdf",
      "paymentId": "pay_XXXXXXXXXXXXX",
      "razorpayOrderId": "order_XXXXXXXXXXX",
      "paymentTimestamp": "2026-01-20T14:35:00.000Z",
      "createdAt": "2026-01-20T14:30:00.000Z",
      "updatedAt": "2026-01-21T10:00:00.000Z",
      "scheme": {
        "id": "scheme-uuid",
        "name": "Scholarship Program",
        "slug": "scholarship-program",
        "category": "STUDENT",
        "serviceFee": "199.00"
      }
    },
    "documents": [
      {
        "id": "doc-uuid",
        "docType": "AADHAAR",
        "fileKey": "users/.../orders/.../AADHAAR_1234567890.pdf",
        "status": "VERIFIED",
        "rejectionReason": null,
        "uploadedAt": "2026-01-20T14:32:00.000Z"
      },
      {
        "id": "doc-uuid-2",
        "docType": "INCOME_CERT",
        "fileKey": "users/.../orders/.../INCOME_CERT_1234567891.pdf",
        "status": "REJECTED",
        "rejectionReason": "Document is blurry, please re-upload",
        "uploadedAt": "2026-01-20T14:33:00.000Z"
      }
    ]
  }
}
```

**Error Responses:**

| Status | Code | Scenario |
|--------|------|----------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT token |
| 403 | `FORBIDDEN` | User is not the order owner and is not an admin |
| 404 | `NOT_FOUND` | No order with this UUID exists |
| 500 | `INTERNAL_ERROR` | Database error |

---

### 3. Get Order Receipt

#### `GET /api/orders/:id/receipt`

Returns a **pre-signed download URL** for the order's receipt PDF. The receipt is a system-generated PDF stored in Cloudflare R2 and is created automatically when the payment is verified.

**Authentication:** Required (User owns the order, or Admin)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string (uuid)` | Yes | Order UUID |

**Authorization Rules:**
- A regular `USER` can only download the receipt for their **own** orders
- An `ADMIN` can download receipts for any order

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://<account>.r2.cloudflarestorage.com/shasansetu-documents/receipts/e5f6.../receipt.pdf?X-Amz-Signature=...&X-Amz-Expires=900",
    "expiresIn": 900
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `downloadUrl` | `string` | Pre-signed URL to `GET` the PDF. **Expires in 15 minutes (900 seconds)**. |
| `expiresIn` | `number` | URL expiry in seconds (always `900`). |

**Error Responses:**

| Status | Code | Scenario |
|--------|------|----------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT token |
| 403 | `FORBIDDEN` | User is not the order owner and is not an admin |
| 404 | `NOT_FOUND` | Order does not exist |
| 404 | `NOT_FOUND` | Receipt has not been generated yet (receipt not available yet) |
| 500 | `INTERNAL_ERROR` | Failed to generate signed URL from R2 |

> **When is the receipt generated?** The receipt PDF is automatically generated during the `/api/payments/verify` call after a successful Razorpay payment. It is uploaded to R2 at key `receipts/{orderId}/receipt.pdf`. The `receiptKey` is stored on the order record. If payment just completed, the receipt should be available immediately.

**Receipt PDF Contents:**
- Receipt number (e.g., `RCP-E5F6A7B8`)
- Date & time of payment
- Applicant name & phone number
- Scheme name
- Application ID (first 8 chars of order UUID)
- Razorpay Payment ID
- Amount paid
- Status: PAYMENT RECEIVED

---

### 4. Update Order Status (Admin)

#### `PATCH /api/orders/:id/status`

Allows an admin to update the status of an order. Enforces strict assignment and transition rules.

**Authentication:** Required (**Admin only**)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string (uuid)` | Yes | Order UUID |

**Request Body:**

| Field | Type | Required | Values | Description |
|-------|------|----------|--------|-------------|
| `status` | `string` | **Yes** | `PAID`, `IN_PROGRESS`, `PROOF_UPLOADED`, `COMPLETED`, `CANCELLED` | New target status |
| `adminNotes` | `string` | No | Any string | Internal notes (e.g. rejection reason) |

**Example Request Body:**
```json
{
  "status": "IN_PROGRESS",
  "adminNotes": "Documents verified, processing started"
}
```

**Assignment Rules:**
- Any admin can **pick up** a `PAID` order by transitioning it to `IN_PROGRESS` — this auto-assigns the order to that admin
- Only the **assigned admin** can then transition the order further
- A **Super Admin** (`role: SUPER_ADMIN`) can override and update any order regardless of assignment

**Valid Transitions:**

| Current Status | Allowed Next Statuses |
|---------------|----------------------|
| `PAID` | `IN_PROGRESS`, `CANCELLED` |
| `IN_PROGRESS` | `PROOF_UPLOADED`, `COMPLETED`, `CANCELLED` |
| `PROOF_UPLOADED` | `COMPLETED`, `CANCELLED` |
| `COMPLETED` | *(none — terminal)* |
| `CANCELLED` | *(none — terminal)* |

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "orderId": "e5f6a7b8-c9d0-1234-abcd-ef5678901234",
    "status": "IN_PROGRESS",
    "assignedTo": "admin-uuid",
    "message": "Order status updated to IN_PROGRESS"
  }
}
```

**Error Responses:**

| Status | Code | Scenario |
|--------|------|----------|
| 400 | `VALIDATION_ERROR` | Invalid transition (e.g., `COMPLETED` → `IN_PROGRESS`) |
| 400 | `VALIDATION_ERROR` | Non-super-admin trying to pick up order that is not in `PAID` status |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT token |
| 403 | `FORBIDDEN` | User is not an admin |
| 403 | `FORBIDDEN` | Order is assigned to a different admin and caller is not Super Admin |
| 404 | `NOT_FOUND` | Order does not exist |
| 500 | `INTERNAL_ERROR` | Database update failed |

---

### 5. Resubmit Order (User)

#### `POST /api/orders/:id/resubmit`

Allows a user to resubmit their **cancelled** order. Resets the order back to `PAID` status so it re-enters the admin queue. All `REJECTED` documents are deleted so the user can upload fresh, corrected versions.

**Authentication:** Required (User — must own the order)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string (uuid)` | Yes | Order UUID |

**Request Body:** None

**Side Effects:**
- Sets `status` → `PAID`
- Clears `assignedTo` → `null`
- Clears `adminNotes` → `null`
- **Deletes all documents** with `status = REJECTED` for this order
- Documents with `UPLOADED` or `VERIFIED` status are retained

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "orderId": "e5f6a7b8-c9d0-1234-abcd-ef5678901234",
    "status": "PAID",
    "message": "Order resubmitted successfully. It will be reviewed again."
  }
}
```

**Error Responses:**

| Status | Code | Scenario |
|--------|------|----------|
| 400 | `VALIDATION_ERROR` | Order is not in `CANCELLED` status |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT token |
| 403 | `FORBIDDEN` | User is not the order owner |
| 404 | `NOT_FOUND` | Order does not exist |
| 500 | `INTERNAL_ERROR` | Database update failed |

---

### 6. Admin Orders Queue

#### `GET /api/orders/admin/queue`

Returns a paginated list of all orders for admin processing, with optional status filtering. Includes joined user and scheme info.

**Authentication:** Required (**Admin only**)

**Query Parameters:**

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `page` | `number` | No | `1` | Page number |
| `limit` | `number` | No | `20` | Results per page (min: 10, max: 100) |
| `status` | `string` | No | — | Filter by status: `PAID`, `IN_PROGRESS`, `PROOF_UPLOADED`, `COMPLETED`, `CANCELLED` |

**Example Requests:**
```
GET /api/orders/admin/queue
GET /api/orders/admin/queue?status=PAID
GET /api/orders/admin/queue?status=IN_PROGRESS&page=2&limit=10
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "e5f6a7b8-c9d0-1234-abcd-ef5678901234",
        "userId": "user-uuid",
        "userName": "Rahul Sharma",
        "userPhone": "9876543210",
        "schemeId": "scheme-uuid",
        "schemeName": "Scholarship Program",
        "paymentAmount": "199.00",
        "status": "PAID",
        "createdAt": "2026-01-20T14:30:00.000Z",
        "paymentTimestamp": "2026-01-20T14:35:00.000Z",
        "assignedTo": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 42,
      "totalPages": 3
    }
  }
}
```

**Error Responses:**

| Status | Code | Scenario |
|--------|------|----------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT token |
| 403 | `FORBIDDEN` | User is not an admin |
| 500 | `INTERNAL_ERROR` | Database error |

> ⚠️ **Route Order Matters:** The `/admin/queue` route is registered **before** `/:id` in the router, so `admin` is matched as a literal path segment and does not conflict with UUID-based routes.

---

### 7. Complete Order (Admin)

#### `POST /api/orders/:id/complete`

Marks an order as **COMPLETED** and sends a push notification to the user.

**Authentication:** Required (**Admin only**)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string (uuid)` | Yes | Order UUID |

**Request Body:** None

**Side Effects:**
- Sets `status` → `COMPLETED`
- Sets `assignedTo` → calling admin's UUID
- Sends an `ORDER_COMPLETED` notification to the order's user

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "orderId": "e5f6a7b8-c9d0-1234-abcd-ef5678901234",
    "status": "COMPLETED",
    "message": "Order completed successfully"
  }
}
```

**Error Responses:**

| Status | Code | Scenario |
|--------|------|----------|
| 400 | `VALIDATION_ERROR` | Order is already in `COMPLETED` status |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT token |
| 403 | `FORBIDDEN` | User is not an admin |
| 404 | `NOT_FOUND` | Order does not exist |
| 500 | `INTERNAL_ERROR` | Database update or notification failure |

---

### Frontend Apply Flow Integration Guide

This section documents exactly how the **`/[locale]/apply/[slug]/page.tsx`** client component uses the order and related APIs. The flow has four steps:

```
Documents → Review → Payment → Success
```

#### Step 1: Load the Scheme
Before the stepper renders, the apply page fetches the scheme using the **public** scheme endpoint:

```typescript
// In useEffect, on mount
const response = await fetch(`/api/schemes/${params.slug}?locale=${locale}`);
const data = await response.json();
// data.data contains: { id, name, slug, requiredDocs, serviceFee, ... }
```

The `requiredDocs` array drives the document upload UI. The scheme's `serviceFee` is used for the payment summary.

---

#### Step 2: Document Upload (Step — `documents`)

Each document is uploaded using a **3-call flow**:

**Call 1 — Get a pre-signed upload URL:**
```typescript
const urlResponse = await api.request('/api/documents/upload-url', {
  method: 'POST',
  body: { documentType: docType, contentType: file.type },
});
// Returns: { uploadUrl, documentId, key }
```

**Call 2 — Upload directly to R2 (not via the API server):**
```typescript
await fetch(uploadUrl, {
  method: 'PUT',
  body: file,
  headers: { 'Content-Type': file.type },
});
```

**Call 3 — Confirm the upload:**
```typescript
await api.request(`/api/documents/${documentId}/confirm-upload`, {
  method: 'POST',
});
```

The component stores `{ documentType, documentId, fileKey, fileName, status }` for each uploaded doc. The `fileKey` (R2 storage key) is later sent to the payment verification endpoint.

> **No orderId at this stage.** Documents are uploaded before payment, so no `orderId` is passed to `upload-url`. The `documentId` is `null` from the response, so `confirm-upload` returns gracefully without a DB record. The actual order-document linking happens during payment verification.

---

#### Step 3: Review & Payment (Step — `review` → `payment`)

When the user clicks "Proceed To Payment":

**Call 1 — Create a Razorpay order:**
```typescript
const orderResponse = await api.request('/api/payments/create-order', {
  method: 'POST',
  body: { schemeId: scheme.id },
});
// Returns: { orderId, razorpayOrderId, razorpayKeyId, amount }
// `orderId` is the ShasanSeva DB order UUID (in PENDING status)
```

**Razorpay modal opens.** On success, Razorpay calls the `handler` callback with `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }`.

**Call 2 — Verify payment & link documents:**
```typescript
const verifyResponse = await api.request('/api/payments/verify', {
  method: 'POST',
  body: {
    razorpayOrderId: response.razorpay_order_id,
    razorpayPaymentId: response.razorpay_payment_id,
    razorpaySignature: response.razorpay_signature,
    orderId: newOrderId,
    documents: uploadedDocs
      .filter(d => d.status === 'uploaded' && d.fileKey)
      .map(d => ({ docType: d.documentType, fileKey: d.fileKey })),
  },
});
```

This single call:
1. Verifies the Razorpay signature
2. Updates the order status to `PAID`
3. Saves the Razorpay payment ID and timestamp
4. Creates document records in the DB and links them to the order
5. **Generates the receipt PDF** via `receipt.service.ts` and stores the `receiptKey` on the order

If the user dismisses the Razorpay modal before completing payment, a cancel call is made:

```typescript
await api.request(`/api/payments/cancel-order/${orderId}`, { method: 'DELETE' });
```

---

#### Step 4: Success Screen + Receipt Download (Step — `success`)

Once `verifyResponse.success` is `true`, the page transitions to `success`. At this point the `orderId` (ShasanSeva UUID) is stored in state.

**The receipt download button calls:**
```typescript
const res = await api.request(`/api/orders/${orderId}/receipt`);
if (res.success) {
  const { downloadUrl } = res.data;
  window.open(downloadUrl, '_blank'); // Opens the PDF in a new tab
}
```

This calls **`GET /api/orders/:id/receipt`**, which:
1. Looks up the order and verifies ownership
2. Checks that `receiptKey` is not null
3. Calls `getDownloadUrl(order.receiptKey)` from `r2.service.ts`
4. Returns a **15-minute pre-signed URL** pointing to `receipts/{orderId}/receipt.pdf` in R2

**Receipt availability:** The receipt is generated synchronously during payment verification, so it should always be available by the time the user sees the success screen. If for some reason it is not (e.g., async generation delay), the API returns `404 NOT_FOUND` with message `"Receipt not available yet"`.

**Frontend handling:**
```typescript
// State to prevent double-tap
const [downloadingReceipt, setDownloadingReceipt] = useState(false);

// Button is disabled while downloading
<button disabled={downloadingReceipt} onClick={async () => {
  if (!orderId) return;
  setDownloadingReceipt(true);
  try {
    const res = await api.request(`/api/orders/${orderId}/receipt`);
    if (res.success) {
      window.open((res.data as { downloadUrl: string }).downloadUrl, '_blank');
    }
  } finally {
    setDownloadingReceipt(false);
  }
}}>
  Download Receipt
</button>
```

---

#### Fee Breakdown Displayed on Success Screen

The apply page calculates the fee breakdown from the scheme's `serviceFee` (which is already inclusive of 18% GST):

```typescript
const fee = Number(scheme.serviceFee);        // e.g., 199
const baseAmount = fee * (100 / 118);          // Pre-GST amount
const appFee = (baseAmount * 0.8).toFixed(2);  // 80% of base = Application Fee
const processingFee = (baseAmount * 0.2).toFixed(2); // 20% of base = Processing Charge
const gst = (fee - baseAmount).toFixed(2);    // GST (18%)
// appFee + processingFee + gst = serviceFee (total shown to user)
```

---

### Document Endpoints

> **Authentication:** All document endpoints require a valid JWT token via `Authorization: Bearer <token>`.  
> **Storage Backend:** Documents are stored in **Cloudflare R2** (S3-compatible) using pre-signed URLs for secure direct uploads/downloads.

---

#### Document Database Model

The `documents` table stores metadata for all uploaded documents:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | **PK**, auto-generated | Unique document identifier |
| `orderId` | `uuid` | **FK → orders.id**, NOT NULL | The order this document belongs to |
| `docType` | `varchar(100)` | NOT NULL | Type of document (e.g., `AADHAAR`, `PAN`, `INCOME_CERT`) |
| `fileUrl` | `text` | NOT NULL | Download URL (populated after upload confirmation) |
| `fileKey` | `varchar(500)` | NOT NULL | R2 object storage key |
| `status` | `varchar(30)` | NOT NULL, default `UPLOADED` | Current verification status |
| `rejectionReason` | `text` | nullable | Reason if document was rejected by admin |
| `uploadedAt` | `timestamp` | NOT NULL, default `now()` | When the document was uploaded |
| `verifiedAt` | `timestamp` | nullable | When admin verified/rejected the document |
| `verifiedBy` | `uuid` | **FK → admins.id**, nullable | Admin who verified/rejected |

---

#### Document Status Lifecycle

```
                    ┌──────────────────────────────────────┐
                    │           UPLOADED                     │
                    │  (Initial status after upload)         │
                    └───────────┬────────────┬──────────────┘
                                │            │
                    Admin Verify │            │ Admin Reject
                                ▼            ▼
                    ┌───────────────┐   ┌──────────────────────┐
                    │   VERIFIED    │   │      REJECTED         │
                    │ (Approved)    │   │ (Reason provided)     │
                    └───────────────┘   └──────────┬───────────┘
                                                   │
                                        User re-uploads
                                                   │
                                                   ▼
                                        ┌──────────────────┐
                                        │   UPLOADED        │
                                        │ (New document     │
                                        │  replaces old)    │
                                        └──────────────────┘
```

**Valid Statuses:** `UPLOADED` | `VERIFIED` | `REJECTED` | `RESUBMISSION_REQUIRED`

---

#### Allowed File Types & Limits

| Content Type | Extension | Description |
|-------------|-----------|-------------|
| `image/jpeg` | `.jpg` | JPEG image |
| `image/png` | `.png` | PNG image |
| `image/webp` | `.webp` | WebP image |
| `application/pdf` | `.pdf` | PDF document |

| Constraint | Value |
|-----------|-------|
| **Max file size** | 10 MB (10,485,760 bytes) |
| **Upload URL expiry** | 5 minutes (300 seconds) |
| **Download URL expiry** | 15 minutes (900 seconds) |

---

#### Storage Key Format

Documents are stored in R2 with structured keys:

```
# With orderId:
users/{userId}/orders/{orderId}/{docType}_{timestamp}.{extension}

# Without orderId:
users/{userId}/documents/{docType}_{timestamp}.{extension}
```

**Example:** `users/a1b2c3d4/orders/e5f6g7h8/AADHAAR_1709020800000.pdf`

---

### 1. Get Upload URL

#### `POST /api/documents/upload-url`

Generates a pre-signed URL for directly uploading a document to Cloudflare R2 storage. The client uses this URL to upload the file via a `PUT` request.

**Authentication:** Required (User or Admin)

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `docType` | `string` | Yes* | Document type identifier (e.g., `AADHAAR`, `PAN`, `INCOME_CERT`). Min 1 character. |
| `documentType` | `string` | Yes* | Alias for `docType`. Either `docType` or `documentType` must be provided. |
| `contentType` | `string` | **Yes** | MIME type of the file. Must be one of: `image/jpeg`, `image/png`, `image/webp`, `application/pdf` |
| `orderId` | `string (uuid)` | No | UUID of the associated order. If provided, a document record is created in the database. |

> **\*** Either `docType` or `documentType` must be provided. If both are provided, `docType` takes precedence. This dual-field support exists for backward compatibility across web and mobile clients.

**Request Body Example:**
```json
{
  "docType": "AADHAAR",
  "contentType": "application/pdf",
  "orderId": "d290f1ee-6c54-4b01-90e6-d701748f0851"
}
```

**Alternative (using `documentType`):**
```json
{
  "documentType": "PAN_CARD",
  "contentType": "image/jpeg"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://<account>.r2.cloudflarestorage.com/shasansetu-documents/users/a1b2.../orders/d290.../AADHAAR_1709020800000.pdf?X-Amz-Signature=...",
    "documentId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "key": "users/a1b2c3d4/orders/d290f1ee/AADHAAR_1709020800000.pdf",
    "expiresIn": 300,
    "allowedTypes": [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf"
    ],
    "maxSize": 10485760
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `uploadUrl` | `string` | Pre-signed URL to `PUT` the file to. Expires in 5 minutes. |
| `documentId` | `string \| null` | UUID of the created document record. `null` if no `orderId` was provided. |
| `key` | `string` | The R2 storage key for this file. |
| `expiresIn` | `number` | URL expiry time in seconds (always `300`). |
| `allowedTypes` | `string[]` | List of accepted MIME types for reference. |
| `maxSize` | `number` | Maximum file size in bytes (always `10485760` = 10 MB). |

**Error Responses:**

| Status | Code | Scenario |
|--------|------|----------|
| 400 | `VALIDATION_ERROR` | Missing `docType`/`documentType`, invalid `contentType`, invalid `orderId` UUID format |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT token |
| 500 | `INTERNAL_ERROR` | Failed to generate signed URL from R2 |

**Validation Error Example:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid enum value. Expected 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf', received 'text/plain'"
  }
}
```

> **Important Behavior — Re-upload / Upsert Logic:**  
> If a document with the same `orderId` + `docType` combination already exists, the **old record is deleted** and a new one is created. This enables users to re-upload documents after rejection without creating duplicate records.

---

### 2. Confirm Upload

#### `POST /api/documents/:id/confirm-upload`

Confirms that the file was successfully uploaded to R2, generates a download URL, and updates the document record.

**Authentication:** Required (User or Admin)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string` | Yes | Document ID returned from the upload-url endpoint. Can also be `null` or `undefined` (handled gracefully). |

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:** None

**Success Response — With valid document ID (200 OK):**
```json
{
  "success": true,
  "data": {
    "document": {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "orderId": "d290f1ee-6c54-4b01-90e6-d701748f0851",
      "docType": "AADHAAR",
      "fileUrl": "https://<account>.r2.cloudflarestorage.com/...?X-Amz-Signature=...",
      "fileKey": "users/a1b2c3d4/orders/d290f1ee/AADHAAR_1709020800000.pdf",
      "status": "UPLOADED",
      "rejectionReason": null,
      "uploadedAt": "2026-01-20T14:32:00.000Z",
      "verifiedAt": null,
      "verifiedBy": null
    },
    "message": "Upload confirmed"
  }
}
```

**Success Response — Without document record (200 OK):**

If the `id` is `null`, `undefined`, or not a valid UUID, the endpoint returns a success response without a document object. This happens when a document was uploaded without an `orderId`.

```json
{
  "success": true,
  "data": {
    "message": "Upload confirmed (no document record)"
  }
}
```

**Error Responses:**

| Status | Code | Scenario |
|--------|------|----------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT token |
| 404 | `NOT_FOUND` | Document ID is a valid UUID but does not exist in database |
| 500 | `INTERNAL_ERROR` | Failed to generate download URL from R2 |

**404 Error Example:**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Document not found"
  }
}
```

---

### 3. Get Download URL

#### `GET /api/documents/:id/download-url`

Generates a pre-signed download URL for a specific document. The URL expires after 15 minutes.

**Authentication:** Required (User or Admin)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string (uuid)` | Yes | Document ID |

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:** None

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://<account>.r2.cloudflarestorage.com/shasansetu-documents/users/.../AADHAAR_1709020800000.pdf?X-Amz-Signature=...",
    "expiresIn": 900,
    "document": {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "docType": "AADHAAR",
      "status": "VERIFIED"
    }
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `downloadUrl` | `string` | Pre-signed URL to `GET` the file. Expires in 15 minutes. |
| `expiresIn` | `number` | URL expiry time in seconds (always `900`). |
| `document.id` | `string` | Document UUID |
| `document.docType` | `string` | Type of the document |
| `document.status` | `string` | Current verification status |

**Error Responses:**

| Status | Code | Scenario |
|--------|------|----------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT token |
| 404 | `NOT_FOUND` | Document with given ID does not exist |
| 500 | `INTERNAL_ERROR` | Failed to generate download URL from R2 |

---

### 4. Verify Document (Admin Only)

#### `PATCH /api/documents/:id/verify`

Allows an admin to mark a document as verified/approved. Sets the `verifiedAt` timestamp and `verifiedBy` admin ID.

**Authentication:** Required (**Admin only**)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string (uuid)` | Yes | Document ID to verify |

**Headers:**
```
Authorization: Bearer <ADMIN_JWT_TOKEN>
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `adminNotes` | `string` | No | Optional notes from the admin for internal records |

**Request Body Example (optional):**
```json
{
  "adminNotes": "All details match with government records"
}
```

**Or simply an empty body:** `{}`

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "documentId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "status": "VERIFIED",
    "message": "Document verified successfully"
  }
}
```

**Error Responses:**

| Status | Code | Scenario |
|--------|------|----------|
| 400 | `VALIDATION_ERROR` | Document is already in `VERIFIED` status |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT token |
| 403 | `FORBIDDEN` | User is not an admin |
| 404 | `NOT_FOUND` | Document with given ID does not exist |
| 500 | `INTERNAL_ERROR` | Server error during update |

**Already Verified Error Example:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Document is already verified"
  }
}
```

**Side Effects:**
- Sets `status` → `VERIFIED`
- Sets `verifiedAt` → current timestamp
- Sets `verifiedBy` → admin's user ID

---

### 5. Reject Document (Admin Only)

#### `PATCH /api/documents/:id/reject`

Allows an admin to reject a document with a mandatory rejection reason. The user can then re-upload the document.

**Authentication:** Required (**Admin only**)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string (uuid)` | Yes | Document ID to reject |

**Headers:**
```
Authorization: Bearer <ADMIN_JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `rejectionReason` | `string` | **Yes** | Min 5 characters | Reason for rejection (shown to the user) |

**Request Body Example:**
```json
{
  "rejectionReason": "Document is blurry and text is not readable. Please upload a clearer scan."
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "documentId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "status": "REJECTED",
    "rejectionReason": "Document is blurry and text is not readable. Please upload a clearer scan.",
    "message": "Document rejected"
  }
}
```

**Error Responses:**

| Status | Code | Scenario |
|--------|------|----------|
| 400 | `VALIDATION_ERROR` | `rejectionReason` is missing or shorter than 5 characters |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT token |
| 403 | `FORBIDDEN` | User is not an admin |
| 404 | `NOT_FOUND` | Document with given ID does not exist |
| 500 | `INTERNAL_ERROR` | Server error during update |

**Validation Error Example:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Rejection reason must be at least 5 characters"
  }
}
```

**Side Effects:**
- Sets `status` → `REJECTED`
- Sets `rejectionReason` → the provided reason
- Sets `verifiedBy` → admin's user ID (for audit trail)

---

### 6. Get Order Documents (Admin Only)

#### `GET /api/documents/order/:orderId`

Retrieves all documents associated with a specific order. Used by admins to review submitted documents for an application.

**Authentication:** Required (**Admin only**)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `orderId` | `string (uuid)` | Yes | Order ID to fetch documents for |

**Headers:**
```
Authorization: Bearer <ADMIN_JWT_TOKEN>
```

**Request Body:** None

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "orderId": "d290f1ee-6c54-4b01-90e6-d701748f0851",
      "docType": "AADHAAR",
      "fileUrl": "https://...",
      "fileKey": "users/a1b2c3d4/orders/d290f1ee/AADHAAR_1709020800000.pdf",
      "status": "VERIFIED",
      "rejectionReason": null,
      "uploadedAt": "2026-01-20T14:32:00.000Z",
      "verifiedAt": "2026-01-21T10:15:00.000Z",
      "verifiedBy": "admin-uuid-here"
    },
    {
      "id": "c81b9a2e-65d4-4c12-b1e7-8f03c4d5e6f7",
      "orderId": "d290f1ee-6c54-4b01-90e6-d701748f0851",
      "docType": "PAN_CARD",
      "fileUrl": "https://...",
      "fileKey": "users/a1b2c3d4/orders/d290f1ee/PAN_CARD_1709020900000.jpg",
      "status": "REJECTED",
      "rejectionReason": "PAN number is not clearly visible",
      "uploadedAt": "2026-01-20T14:33:00.000Z",
      "verifiedAt": null,
      "verifiedBy": "admin-uuid-here"
    },
    {
      "id": "b72a8b1d-54c3-4b01-a0d6-7e12b3c4d5e6",
      "orderId": "d290f1ee-6c54-4b01-90e6-d701748f0851",
      "docType": "INCOME_CERT",
      "fileUrl": "https://...",
      "fileKey": "users/a1b2c3d4/orders/d290f1ee/INCOME_CERT_1709021000000.pdf",
      "status": "UPLOADED",
      "rejectionReason": null,
      "uploadedAt": "2026-01-20T14:34:00.000Z",
      "verifiedAt": null,
      "verifiedBy": null
    }
  ]
}
```

**Response:** Returns an array of document objects. Empty array `[]` if no documents are found for the order.

**Error Responses:**

| Status | Code | Scenario |
|--------|------|----------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT token |
| 403 | `FORBIDDEN` | User is not an admin |
| 500 | `INTERNAL_ERROR` | Database query failed |

---

### Document Upload Integration Guide

This section provides step-by-step instructions for implementing document upload in frontend and mobile apps.

#### Complete Upload Flow (3 Steps)

```
┌─────────────────────┐    ┌─────────────────────────┐    ┌──────────────────────────┐
│  STEP 1              │    │  STEP 2                  │    │  STEP 3                   │
│  Get Upload URL      │───▶│  Upload File to R2       │───▶│  Confirm Upload            │
│  POST /upload-url    │    │  PUT to uploadUrl         │    │  POST /:id/confirm-upload  │
└─────────────────────┘    └─────────────────────────┘    └──────────────────────────┘
```

#### Step 1: Request an Upload URL

```javascript
// Frontend / Mobile
const response = await fetch('/api/documents/upload-url', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    docType: 'AADHAAR',              // or documentType: 'AADHAAR'
    contentType: 'application/pdf',   // must match the actual file type
    orderId: 'd290f1ee-...',          // optional, links doc to an order
  }),
});

const { data } = await response.json();
// data.uploadUrl  → use in Step 2
// data.documentId → use in Step 3 (null if no orderId)
// data.key        → storage key for reference
```

#### Step 2: Upload File Directly to R2

```javascript
// Upload the file binary directly to the pre-signed URL
// IMPORTANT: Use PUT method, set Content-Type to match what was requested
await fetch(data.uploadUrl, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/pdf', // must match contentType from Step 1
  },
  body: fileBlob,  // File, Blob, or ArrayBuffer
});
```

> ⚠️ **Critical:** The `Content-Type` header in the PUT request **must exactly match** the `contentType` sent in Step 1. A mismatch will cause a signature error from R2.

#### Step 3: Confirm the Upload

```javascript
// Confirm the upload was successful
const confirmResponse = await fetch(`/api/documents/${data.documentId}/confirm-upload`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const confirmData = await confirmResponse.json();
// confirmData.data.document → full document object with fileUrl
```

#### React Native / Mobile Upload Example

```javascript
// For React Native with image picker
import { launchImageLibrary } from 'react-native-image-picker';

async function uploadDocument(orderId, docType) {
  // 1. Pick file
  const result = await launchImageLibrary({ mediaType: 'mixed' });
  const file = result.assets[0];

  // 2. Determine content type
  const contentType = file.type; // e.g., 'image/jpeg'

  // 3. Get upload URL
  const urlRes = await api.post('/documents/upload-url', {
    docType,
    contentType,
    orderId,
  });

  // 4. Upload to R2
  const fileBlob = await fetch(file.uri).then(r => r.blob());
  await fetch(urlRes.data.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: fileBlob,
  });

  // 5. Confirm
  await api.post(`/documents/${urlRes.data.documentId}/confirm-upload`);
}
```

#### Admin Document Review Flow

```
┌──────────────────────┐     ┌─────────────────────┐
│ GET /order/:orderId  │────▶│ View all documents   │
│ (Fetch documents)    │     │ for the order        │
└──────────────────────┘     └───────┬──────────────┘
                                     │
                        ┌────────────┴────────────┐
                        ▼                         ▼
              ┌─────────────────┐      ┌─────────────────────┐
              │ PATCH /:id/     │      │ PATCH /:id/reject   │
              │    verify       │      │ (with reason)       │
              └─────────────────┘      └─────────────────────┘
```

```javascript
// Admin: Fetch documents for review
const docs = await api.get(`/documents/order/${orderId}`);

// Admin: Verify a document
await api.patch(`/documents/${docId}/verify`, {
  adminNotes: 'Looks good', // optional
});

// Admin: Reject a document
await api.patch(`/documents/${docId}/reject`, {
  rejectionReason: 'Document expired, please upload a recent copy', // required, min 5 chars
});
```

---

### Document Endpoints Quick Reference

| # | Method | Endpoint | Auth | Role | Description |
|---|--------|----------|------|------|-------------|
| 1 | `POST` | `/api/documents/upload-url` | ✅ | User/Admin | Get pre-signed upload URL |
| 2 | `POST` | `/api/documents/:id/confirm-upload` | ✅ | User/Admin | Confirm file upload to R2 |
| 3 | `GET` | `/api/documents/:id/download-url` | ✅ | User/Admin | Get pre-signed download URL |
| 4 | `PATCH` | `/api/documents/:id/verify` | ✅ | **Admin** | Approve a document |
| 5 | `PATCH` | `/api/documents/:id/reject` | ✅ | **Admin** | Reject a document with reason |
| 6 | `GET` | `/api/documents/order/:orderId` | ✅ | **Admin** | List all docs for an order |

---

### Payment Endpoints

#### `POST /api/payments/create-order`
Create a Razorpay payment order.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "schemeId": "scheme-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "order-uuid",
    "razorpayOrderId": "order_xxx",
    "razorpayKeyId": "rzp_test_xxx",
    "amount": 19900,
    "currency": "INR",
    "schemeName": "Scholarship Program"
  }
}
```

> **Note:** `amount` is in **paise** (smallest currency unit). Divide by 100 for rupees.

---

#### `POST /api/payments/verify`
Verify payment after Razorpay checkout completes.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "razorpayOrderId": "order_xxx",
  "razorpayPaymentId": "pay_xxx",
  "razorpaySignature": "signature_hash",
  "orderId": "order-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "order-uuid",
    "status": "PAID",
    "message": "Payment successful! Your application is now being processed."
  }
}
```

---

## Important Notes for Mobile Developers

### 1. Phone Number Format
All phone numbers must be **10-digit Indian numbers** starting with `6`, `7`, `8`, or `9`. Do NOT include country code.
```
✅ 9876543210
❌ +919876543210
❌ 5551234567
```

### 2. Token Storage
- Store the JWT token securely (Keychain on iOS, EncryptedSharedPreferences on Android)
- Token is returned after login/register
- Include in all authenticated requests

### 3. Profile Completion
After login, check: 
- `user.profileComplete === false` → Navigate to profile completion screen
- Required fields: `name`, `phone`, `category`

### 4. Document Upload Flow

See the [Document Upload Integration Guide](#document-upload-integration-guide) section above for complete step-by-step instructions with code examples for both web and React Native.

```
1. POST /api/documents/upload-url → Get uploadUrl + documentId
2. PUT file binary to uploadUrl with matching Content-Type header
3. POST /api/documents/:id/confirm-upload → Confirm & get fileUrl
```

> ⚠️ **Important:** The `Content-Type` in the PUT request must **exactly** match the `contentType` from Step 1, or R2 will reject the upload with a signature error.

### 5. Payment Integration (Razorpay)
- Use [Razorpay Mobile SDK](https://razorpay.com/docs/payments/payment-gateway/flutter-integration/)
- Amount is in **paise**, not rupees
- After payment, call `/api/payments/verify` with all Razorpay response fields

### 6. Offline Support Considerations
- Cache schemes list locally
- Queue document uploads when offline
- Store user profile locally

### 7. Error Handling
Always check `response.success`. If `false`, show `response.error.message` to user.

### 8. Rate Limiting
- API may rate limit excessive requests
- Implement exponential backoff for retries

---

## Localization

The API supports **English (en)** and **Marathi (mr)** languages.

### How to Use
Pass `locale` query parameter to endpoints:
```
GET /api/schemes?locale=mr
GET /api/schemes/scholarship-program?locale=mr
```

### Translated Fields
| Endpoint | Translated Fields |
|----------|-------------------|
| Schemes List | `name`, `description` |
| Scheme Detail | `name`, `description`, `eligibility`, `benefits`, `requiredDocs[].label` |

### Fallback Behavior
If Marathi translation is missing, English content is returned.

---

## Contact

For API issues or questions, contact the backend team.

---

*Documentation generated for ShasanSeva v1.0.0*
