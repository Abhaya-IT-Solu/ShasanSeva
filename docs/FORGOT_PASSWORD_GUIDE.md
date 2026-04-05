# Forgot Password — OTP Reset Flow Guide

> **For:** Flutter Mobile Development Team  
> **Feature:** Password Reset via Firebase Phone OTP  
> **Backend Endpoint:** `POST /api/auth/reset-password`  
> **Last Updated:** March 2026

---

## Overview

When a user forgets their password, they can reset it by verifying ownership of their registered phone number using a one-time password (OTP) sent via SMS. This process uses **Firebase Phone Authentication** on the client side and the **ShasanSetu backend API** to apply the new password.

The entire flow has three steps and requires **no knowledge of the old password**.

---

## How It Works — Big Picture

```
User forgets password
        ↓
User enters their registered phone number
        ↓
Firebase sends an SMS OTP to that number
        ↓
User enters the OTP to prove they own the number
        ↓
Firebase returns a verified ID token to the app
        ↓
App sends that ID token + new password to the backend
        ↓
Backend verifies the token, finds the user, updates the password,
creates a new session, and returns a JWT — same as a normal login
        ↓
User is automatically logged in with the new password
```

---

## Step-by-Step Flow

### Step 1 — User enters their phone number

The user navigates to the "Forgot Password" screen from the login page.

They enter their **10-digit Indian mobile number** (without `+91` or the country code — the app prepends it automatically before sending to Firebase).

**What the app does at this point:**
- Validates that the number is a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9)
- Initialises Firebase Phone Authentication
- Calls Firebase's `signInWithPhoneNumber` with `+91<number>`
- Firebase sends an OTP SMS to the user and returns a `ConfirmationResult` object
- The app moves to Step 2

**Important notes:**
- The app does NOT call the backend yet at this stage
- Firebase handles the SMS sending — not your server
- Firebase has built-in rate limiting: if a number requests too many OTPs too quickly, it will be temporarily blocked
- Always show a **60-second cooldown timer** before allowing a resend to prevent spam taps
- If the phone number is invalid or unrecognised by Firebase, display an appropriate error

---

### Step 2 — User enters the OTP

The user receives an SMS from Firebase containing a **6-digit OTP**.

They type the code into the app.

**What the app does at this point:**
- Calls Firebase's `confirmationResult.confirm(otpCode)` with the 6 digits the user entered
- If the OTP is correct, Firebase returns a verified `UserCredential`
- The app calls `userCredential.user.getIdToken()` to get a **Firebase ID Token** (a long JWT string)
- The app stores this ID token temporarily in memory (not on disk)
- The app moves to Step 3

**Important notes:**
- OTPs expire after **5 minutes** by default — if the user takes too long, they must request a new one
- Firebase ID tokens expire after **1 hour** — the app should call `getIdToken()` and immediately proceed to Step 3 without delay
- If the user enters a wrong OTP, Firebase returns `auth/invalid-verification-code` — show a clear "Incorrect OTP" message
- Allow the user to resend the OTP if the 60-second timer has expired — this requires reinitialising Firebase Phone Auth from Step 1

---

### Step 3 — User sets a new password

The user enters their desired new password (and confirms it).

**What the app does at this point:**
- Validates the new password locally:
  - Minimum **8 characters**
  - Must contain **at least one digit (0–9)**
  - Both password and confirm-password fields must match
- Calls `POST /api/auth/reset-password` on the backend (see API reference below)
- If the backend responds with success, the user is automatically logged in
- Navigate the user to their home screen (or complete-profile screen if profile is incomplete)

---

## Backend API Reference

### `POST /api/auth/reset-password`

| Property | Value |
|---|---|
| **URL** | `https://your-backend-domain.com/api/auth/reset-password` |
| **Method** | POST |
| **Authentication** | ❌ Not required — this is a public endpoint |
| **Who can use it** | Regular users only (not admins) |

**Request body (JSON):**

| Field | Type | Required | Rules |
|---|---|---|---|
| `firebaseIdToken` | string | ✅ | The ID token obtained from Firebase after OTP confirmation |
| `newPassword` | string | ✅ | Min 8 characters, must include at least 1 number |

**Success response (HTTP 200):**

The response is identical in structure to a normal login response. Treat it the same way.

| Field | Description |
|---|---|
| `success` | `true` |
| `data.token` | A new JWT session token — store this and use it for all future API calls |
| `data.userType` | Always `"USER"` for this endpoint |
| `data.user.id` | The user's ID |
| `data.user.phone` | The user's phone number |
| `data.user.name` | The user's name (may be null) |
| `data.user.profileComplete` | Whether the user has completed their profile |

**After receiving a success response:**
1. Store the JWT token securely (same as you do after a normal login)
2. If `profileComplete` is `false` → navigate to Complete Profile screen
3. If `profileComplete` is `true` → navigate to Home/Orders screen

---

**Error responses:**

| HTTP Status | Meaning | What to show the user |
|---|---|---|
| `400` | Firebase token is invalid or expired | "Session expired. Please request a new OTP." |
| `400` | Phone number not found in the system | "This phone number is not registered. Please sign up." |
| `400` | New password doesn't meet the rules | "Password must be at least 8 characters and include a number." |
| `500` | Server error | "Something went wrong. Please try again." |

---

## Important Rules & Edge Cases

### Phone number must be registered
The backend looks up the user by the phone number extracted from the Firebase ID token. If no user exists with that phone number, the request is rejected. The user should be shown a clear message to register instead.

### Admins cannot use this flow
This endpoint only resets passwords for regular users stored in the `users` table. Admin accounts are separate (stored in the `admins` table) and cannot be reset through this flow. Admin password resets are handled by a Super Admin via the admin panel.

### Auto-login after reset
The backend creates a new session immediately after resetting the password and returns a JWT. **Do not redirect the user to the login screen** after a successful reset — log them in automatically using the returned token, exactly as you would after a normal login.

### Testing locally / in development
Real phone numbers only work reliably on deployed app builds with trusted domains (not `localhost`). For local development and emulator testing, use the **Firebase test phone numbers** configured in the Firebase Console:

- Go to **Firebase Console → Authentication → Sign-in method → Phone → Phone numbers for testing**
- Use a pre-configured test number and static OTP code
- These bypass SMS and reCAPTCHA entirely

### OTP resend behaviour
- After sending the first OTP, start a **60-second countdown** before enabling the resend button
- When the user taps resend, reinitialise Firebase Phone Auth completely (do not reuse the old confirmation result)
- Each resend attempt counts toward Firebase's rate limit for that number

### Firebase ID token lifetime
Firebase ID tokens are valid for **1 hour**. In practice, the user should move from Step 2 to Step 3 within seconds. If for any reason there is a long delay, the token may be expired and the backend will reject it — the user will need to start over from Step 1.

---

## Screen Flow Summary

```
Login Screen
    ↓ [User taps "Forgot Password?"]
Forgot Password Screen — Step 1: Enter Phone Number
    ↓ [OTP sent successfully]
Forgot Password Screen — Step 2: Enter OTP
    ↓ [OTP verified by Firebase]
Forgot Password Screen — Step 3: Set New Password
    ↓ [Password reset + auto-login]
Home Screen (or Complete Profile Screen)
```

---

## Checklist Before Implementation

- [ ] Firebase project configured with Phone Authentication enabled
- [ ] `google-services.json` (Android) or `GoogleService-Info.plist` (iOS) up to date with the new Firebase project
- [ ] Firebase Phone Auth dependencies added to `pubspec.yaml`
- [ ] Resend OTP cooldown timer implemented (60 seconds minimum)
- [ ] All three password validation rules enforced on the client before calling the API
- [ ] JWT token stored securely after successful reset (same storage as normal login token)
- [ ] Navigation logic handles both `profileComplete: true` and `profileComplete: false`
- [ ] Test phone numbers added in Firebase Console for team testing

---

> **Questions?** Contact the backend team. For Firebase configuration access (adding test numbers, checking authorized domains), contact the project admin.
