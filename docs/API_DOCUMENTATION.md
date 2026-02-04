# ShasanSeva API Documentation

> **Version:** 1.0.0  
> **Base URL:** `https://your-api-domain.com/api`  
> **Last Updated:** February 2026

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

#### `GET /api/schemes`
List all active schemes.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `category` | string | Filter by category: `STUDENT`, `FARMER`, `LOAN`, `CERTIFICATE`, `JOBS`, `HEALTH`, `OTHER` |
| `schemeType` | string | `GOVERNMENT` or `PRIVATE` |
| `search` | string | Search in name/description |
| `locale` | string | `en` or `mr` for language |

**Example:** `GET /api/schemes?category=STUDENT&locale=mr`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "slug": "scholarship-program",
      "name": "Scholarship Program",
      "description": "Financial aid for students",
      "category": "STUDENT",
      "schemeType": "GOVERNMENT",
      "serviceFee": "199.00",
      "status": "ACTIVE"
    }
  ]
}
```

---

#### `GET /api/schemes/:slug`
Get scheme details by slug.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `locale` | string | `en` or `mr` for translations |

**Example:** `GET /api/schemes/scholarship-program?locale=mr`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "slug": "scholarship-program",
    "name": "शिष्यवृत्ती कार्यक्रम",
    "description": "विद्यार्थ्यांसाठी आर्थिक मदत",
    "category": "STUDENT",
    "schemeType": "GOVERNMENT",
    "eligibility": "Students with 60% marks",
    "benefits": "Up to ₹50,000 scholarship",
    "serviceFee": "199.00",
    "requiredDocs": [
      {
        "type": "AADHAAR",
        "label": "आधार कार्ड",
        "required": true,
        "description": "12-digit Aadhaar number"
      }
    ]
  }
}
```

> ⚠️ **Translations:** When `locale=mr`, the `name`, `description`, `eligibility`, `benefits`, and document `label` fields will be in Marathi (if available).

---

### Order Endpoints

#### `GET /api/orders`
Get current user's orders (applications).

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "order-uuid",
      "schemeId": "scheme-uuid",
      "schemeName": "Scholarship Program",
      "status": "IN_PROGRESS",
      "amount": "199.00",
      "createdAt": "2026-01-20T14:30:00Z"
    }
  ]
}
```

---

#### `GET /api/orders/:id`
Get order details with documents.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "order-uuid",
      "schemeId": "scheme-uuid",
      "userId": "user-uuid",
      "status": "IN_PROGRESS",
      "amount": "199.00",
      "paymentId": "pay_xxx",
      "paymentTimestamp": "2026-01-20T14:35:00Z",
      "scheme": {
        "id": "scheme-uuid",
        "name": "Scholarship Program",
        "slug": "scholarship-program"
      }
    },
    "documents": [
      {
        "id": "doc-uuid",
        "documentType": "AADHAAR",
        "status": "VERIFIED",
        "fileUrl": "https://...",
        "uploadedAt": "2026-01-20T14:32:00Z"
      }
    ]
  }
}
```

**Order Status Flow:**
```
PENDING → PAID → IN_PROGRESS → PROOF_UPLOADED → COMPLETED
                     ↓
                  CANCELLED
```

---

### Document Endpoints

#### `POST /api/documents/upload-url`
Get a pre-signed URL to upload a document to cloud storage.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "documentType": "AADHAAR",
  "contentType": "application/pdf",
  "orderId": "order-uuid"  // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://storage.example.com/upload?signature=...",
    "documentId": "doc-uuid",
    "key": "documents/user-uuid/aadhaar-123.pdf",
    "expiresIn": 3600,
    "allowedTypes": ["image/jpeg", "image/png", "application/pdf", "image/webp"],
    "maxSize": 10485760
  }
}
```

**Upload Flow:**
1. Call this endpoint to get `uploadUrl`
2. `PUT` the file directly to `uploadUrl` with `Content-Type` header
3. Call `/api/documents/:id/confirm-upload` to confirm

---

#### `POST /api/documents/:id/confirm-upload`
Confirm that file upload was successful.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "document": {
      "id": "doc-uuid",
      "documentType": "AADHAAR",
      "status": "PENDING",
      "fileUrl": "https://..."
    }
  }
}
```

---

#### `GET /api/documents/:id/download-url`
Get a signed URL to download a document.

**Response:**
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://storage.example.com/file?signature=..."
  }
}
```

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
```
1. POST /api/documents/upload-url → Get uploadUrl
2. PUT file to uploadUrl with Content-Type header
3. POST /api/documents/:id/confirm-upload → Confirm
```

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
