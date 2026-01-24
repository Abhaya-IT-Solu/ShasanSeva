# Detailed Requirements Document (DRD)

## Scheme Assistance Platform

---

## Table of Contents

1. System Overview
2. User Types and Roles
3. Authentication & Access
4. Core Business Concepts
5. Payment System Requirements
6. Document Management
7. Admin Proof Upload
8. Communication Model
9. Notifications
10. User Profile Management
11. Admin Capabilities
12. Technical Foundations
13. End-to-End User Workflows
14. Admin Workflows
15. Failure Handling & Edge Cases
16. Security Requirements
17. Compliance & Legal Safety
18. Performance & Scalability
19. Non-Functional Requirements
20. Explicit Out-of-Scope
21. Final System Philosophy

---

## 1. System Overview

### 1.1 What the System Is

A **paid assistance platform** that helps users apply for government and private schemes.

The platform:

* Does **not** apply automatically
* Does **not** guarantee approval
* Provides professional assistance, document handling, and application support

Users pay **upfront** to request assistance.
Admins perform the work and upload proof.

The platform acts as:

* A transaction system
* A document management system
* A single source of truth

---

### 1.2 What the System Is NOT

The system is **not**:

* A government portal
* A free information website
* A chat-based support system
* A marketplace between users and random agents

This distinction is **critical** for design, messaging, and legal safety.

---

## 2. User Types and Roles

### 2.1 End Users

Supported categories (not permissions):

* Students
* Farmers
* Loan Candidates

All users have identical system capabilities.

Future categories can be added **without database redesign**.

---

### 2.2 Admin Users

Admins are internal platform operators.

Admins can:

* Manage schemes
* Handle orders
* Verify documents
* Upload proof
* Complete orders

Admins **do not** handle payments manually.

---

## 3. Authentication & Access

### 3.1 Authentication Methods (Passwordless Only)

Supported methods:

* SMS OTP
* WhatsApp OTP
* Google OAuth

There is:

* No password creation
* No password storage
* No password reset

---

### 3.2 Authentication Rules

* OTPs are time-bound
* OTP attempts are rate-limited
* Sessions are stored server-side
* Redis is used for OTP/session handling

If authentication fails → **no access**

---

### 3.3 Authorization Rules

Users can access:

* Their own profile
* Their own orders
* Their own documents

Admins can access:

* All users
* All orders
* All documents
* All schemes

No cross-user visibility is allowed.

---

## 4. Core Business Concepts (Very Important)

### 4.1 Scheme

A **Scheme** represents a government or private program users can apply for.

Each scheme contains:

* Name
* Description
* Category (Student / Farmer / Loan)
* Scheme Type (Government / Private)
* Eligibility criteria
* Benefits
* Required documents list
* Status (`ACTIVE` / `INACTIVE`)

A scheme defines **document requirements**.

---

### 4.2 Order (Central Entity)

An **Order** represents a **paid request for assistance**.

* Created **only after successful payment**
* If payment fails → order does not exist

Each order links:

* User
* Scheme
* Payment
* Documents
* Proof of work

Orders are immutable in terms of payment status.

---

### 4.3 Order Lifecycle

Orders move through **defined states only**:

1. `PAID`
2. `IN_PROGRESS`
3. `PROOF_UPLOADED`
4. `COMPLETED`
5. `CANCELLED` (admin-only, rare)

There is **no unpaid order state**.

---

## 5. Payment System Requirements

### 5.1 Payment Model

* 100% upfront payment
* Mandatory to create an order
* No partial payments
* No pay-later option

Payments are **one-to-one** with orders.

---

### 5.2 Payment Flow

1. User submits details + documents
2. User is redirected to payment
3. Payment succeeds
4. Order is created
5. Admin work begins

If payment fails:

* Documents are discarded
* No order is stored

---

### 5.3 Payment Data Stored

For every order:

* Amount paid
* Transaction ID
* Payment timestamp
* Payment status (success only)

Refunds are **out of scope** for now, but data models must allow them later.

---

## 6. Document Management (Core Feature)

### 6.1 Document Upload by Users

Rules:

* Documents uploaded **before payment**
* Missing documents → cannot proceed
* Upload happens **inside the platform only**

Allowed formats:

* PDF
* JPG / PNG

File limits:

* Size limits per file
* One or more files per document type

---

### 6.2 Document Structure

Each uploaded document has:

* Document type (from scheme)
* File URL
* Upload timestamp
* Verification status
* Rejection reason (if any)

---

### 6.3 Document Status Lifecycle

Each document can be:

* `UPLOADED`
* `VERIFIED`
* `REJECTED`
* `RESUBMISSION_REQUIRED`

Admins control verification.

Users can **only re-upload rejected documents**.

---

### 6.4 Document Access Control

Documents are visible only to:

* The uploading user
* Authorized admins

Documents are **never public**.

---

## 7. Admin Proof Upload

### 7.1 Proof Definition

Proof represents evidence that:

* The application was submitted
* Assistance work was completed

Proof types include:

* Application receipt
* Reference ID
* Screenshot
* Confirmation document

---

### 7.2 Proof Rules

* Proof upload is mandatory
* Order cannot be marked `COMPLETED` without proof
* Multiple proof files are allowed
* Proof is visible to users after upload

---

## 8. Communication Model

### 8.1 What the Platform Handles

* Order status updates
* Document status updates
* Proof visibility
* Notifications

---

### 8.2 What the Platform Does NOT Handle

* Chat
* Messaging threads
* Call scheduling
* WhatsApp conversations

Calls and WhatsApp are **off-platform**.
The platform remains the **official record**.

---

## 9. Notifications (Minimum Required)

Users receive notifications when:

* Payment is successful
* Order status changes
* Document is rejected
* Proof is uploaded
* Order is completed

Notification types:

* In-app (mandatory)
* SMS / WhatsApp (optional later)

---

## 10. User Profile Management

Users can:

* View profile
* Update basic info
* See order history
* See document status

Profile edits **do not affect existing orders**.

---

## 11. Admin Capabilities (Operational)

Admins can:

* Manage schemes
* View users
* View orders
* Change order states
* Verify documents
* Upload proof
* View payment info
* Add internal notes

Admins **cannot**:

* Modify payment records
* Access unrelated user accounts casually

---

## 12. Technical Foundations (Locked)

* Backend: Service-based architecture

**Redis usage:**

* OTP/session handling
* Rate limiting
* Scheme list caching

**Client-side caching:**

* Scheme data
* Orders
* User profile

---

## 13. End-to-End User Workflows

### 13.1 User Onboarding & Login

1. User lands on platform
2. Chooses authentication method
3. System verifies authentication
4. Profile auto-created if first-time
5. User redirected to scheme discovery

No manual signup. No passwords.

---

### 13.2 Scheme Discovery

1. User browses schemes
2. Filters by:

   * Category
   * Scheme type
3. Opens scheme detail page
4. Reviews:

   * Eligibility
   * Benefits
   * Required documents
   * Service fee
5. Proceeds only if eligible (self-declared)

System does **not auto-reject** based on eligibility.

---

### 13.3 Order Creation (Critical Path)

1. User clicks **Request Assistance**
2. System shows:

   * Required documents checklist
   * Upload interface
3. User uploads all documents
4. System validates:

   * File type
   * File size
   * Required count
5. User consents & accepts disclaimers
6. User proceeds to payment
7. Payment succeeds
8. Order is created
9. Order state = `PAID`

If any step fails → order creation is aborted.

---

### 13.4 Order Tracking (User Side)

Users can view:

* Order status
* Scheme details
* Uploaded documents
* Document verification status
* Proof uploaded by admin
* Order timeline

Users cannot:

* Modify paid orders
* Change scheme
* Delete orders

---

## 14. Admin Workflows

### 14.1 Admin Order Processing

1. Admin views new orders (`PAID`)
2. Reviews documents
3. Marks each as:

   * `VERIFIED` or `REJECTED`
4. If rejected:

   * Adds rejection reason
   * Order remains `IN_PROGRESS`
5. User re-uploads documents
6. Admin completes application work
7. Uploads proof
8. Order state → `PROOF_UPLOADED`
9. Admin marks order `COMPLETED`

Admin cannot complete an order without proof.

---

### 14.2 Admin Scheme Management

Admins can:

* Create new schemes
* Define required documents
* Set service fees
* Activate / deactivate schemes

Deactivated schemes:

* Are hidden from users
* Do not affect existing orders

---

### 14.3 Admin User Management

Admins can:

* View user list
* View user profile
* View user orders

Admins cannot:

* Edit user identity arbitrarily
* Access documents without valid order context

---

## 15. Failure Handling & Edge Cases

### 15.1 Payment Failures

* No order created
* Uploaded documents discarded
* User must restart flow

No `PENDING_PAYMENT` state exists.

---

### 15.2 Document Rejection Loop

* Rejected documents must include a reason
* Only rejected documents are re-uploadable
* Order proceeds only after all documents are verified

Infinite loops are prevented by admin discretion.

---

### 15.3 Admin Inaction

If admin does not act:

* Order remains `PAID` or `IN_PROGRESS`
* System does not auto-complete or auto-cancel

SLA handling is a **business concern**, not system default.

---

## 16. Security Requirements

### 16.1 Data Security

* Documents stored in private object storage
* Access via short-lived signed URLs
* No public document URLs

---

### 16.2 Access Control

* Users access only their data
* Admin access is role-verified
* Every document access is authenticated

---

### 16.3 Audit Logging (Mandatory)

System logs:

* Order state changes
* Document verification actions
* Proof uploads
* Admin actions

Logs are immutable and timestamped.

---

## 17. Compliance & Legal Safety (System-Level)

Platform must display:

* Service disclaimer
* No-guarantee clause
* Consent checkbox before payment

System stores:

* Consent timestamp
* Accepted terms version

This protects the platform in disputes.

---

## 18. Performance & Scalability

### 18.1 Caching Strategy

**Redis:**

* OTPs
* Sessions
* Rate limiting
* Scheme list cache

**Client-side caching:**

* Scheme data
* User profile
* Order lists

Cache invalidation occurs on:

* Scheme updates
* Order state changes

---

### 18.2 File Storage

* Object storage (S3/R2 equivalent)
* Folder structure:

  * `/orders/{orderId}/documents/`
  * `/orders/{orderId}/proof/`

No documents stored in database.

---

### 18.3 Horizontal Scalability

* Stateless backend services
* Shared Redis
* Shared object storage

System scales by adding instances.

---

## 19. Non-Functional Requirements

### 19.1 Availability

* Platform tolerates partial service failures
* Auth and payment failures must not corrupt data

---

### 19.2 Observability

* Error logging
* Request tracing
* Payment failure monitoring

---

### 19.3 Maintainability

* Clear entity boundaries
* No hardcoded business rules
* Extensible user categories

---

## 20. Explicit Out-of-Scope (Locked)

The system will NOT include:

* In-app chat
* User-to-user communication
* AI eligibility checks
* Automatic scheme approval
* Offline document handling

These are intentionally excluded.

---

## 21. Final System Philosophy (Locked)

* Upfront payment only
* Documents are mandatory
* Proof is mandatory
* Platform is the source of truth
* Trust is earned through process, not promises

---

## Final Note (Important)

This document defines:

* A real production system
* With clear boundaries
* And zero ambiguous states

You can now:

* Design database schemas
* Write APIs
* Build frontend and backend in parallel
* Hand this to another engineer without explanation