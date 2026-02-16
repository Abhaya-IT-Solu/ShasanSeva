# Shasan Setu — Mobile App Authentication & Authorization Guide

> **For:** Flutter Mobile Development Team  
> **Backend Version:** 1.0.0  
> **Base URL:** `https://your-api-domain.com/api`  
> **Last Updated:** February 2026  
> **Related:** See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for full endpoint reference.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [How Authentication Works](#2-how-authentication-works)
3. [User Registration & Login](#3-user-registration--login)
4. [Admin Login](#4-admin-login)
5. [Session Management (JWT)](#5-session-management-jwt)
6. [Role-Based Access Control (RBAC)](#6-role-based-access-control-rbac)
7. [Flutter Implementation Guide](#7-flutter-implementation-guide)
8. [Admin Setup (First-Time Only)](#8-admin-setup-first-time-only)
9. [API Quick Reference](#9-api-quick-reference)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Architecture Overview

### ⚠️ IMPORTANT — Two Separate Tables

The backend uses **two separate database tables** — not one combined table:

```
┌──────────────────────┐     ┌──────────────────────┐
│       users          │     │       admins         │
├──────────────────────┤     ├──────────────────────┤
│ id (UUID)            │     │ id (UUID)            │
│ phone (unique)       │     │ phone (unique)       │
│ email                │     │ email                │
│ name                 │     │ name                 │
│ category             │     │ role (ADMIN/         │
│ passwordHash         │     │       SUPER_ADMIN)   │
│ address (JSON)       │     │ passwordHash         │
│ profileComplete      │     │ isActive             │
│ createdAt            │     │ createdBy (UUID)     │
│ updatedAt            │     │ createdAt            │
└──────────────────────┘     │ updatedAt            │
                             └──────────────────────┘
```

**What this means for the mobile app:**
- You do **NOT** need to add a `role` or `userType` field to the `users` table.
- You do **NOT** need to manually update any user's role in the database.
- Regular users are stored in the `users` table. Admins are stored in the `admins` table.
- The **same login API** (`POST /api/auth/login`) handles both user and admin logins.
- The API automatically detects whether a phone number belongs to a user or an admin and returns the appropriate `userType`.

---

## 2. How Authentication Works

### Login Flow (Single Endpoint for Both)

```
Mobile App                          Backend
   │                                  │
   │  POST /api/auth/login            │
   │  { phone, password }             │
   │ ─────────────────────────────►   │
   │                                  │  1. Check admins table first
   │                                  │  2. If found → return userType: "ADMIN"
   │                                  │  3. If not → check users table
   │                                  │  4. If found → return userType: "USER"
   │                                  │  5. Create JWT + Redis session
   │   ◄───────────────────────────── │
   │  {                               │
   │    token: "eyJ...",              │
   │    userType: "USER" | "ADMIN",   │
   │    user: { ... }                 │
   │  }                               │
   │                                  │
   │  ── App checks userType ──       │
   │                                  │
   │  userType == "USER"              │
   │    → Navigate to User Home       │
   │                                  │
   │  userType == "ADMIN"             │
   │    → Navigate to Admin Dashboard │
   │    → user.role gives ADMIN or    │
   │      SUPER_ADMIN                 │
```

### Key Points
1. **One login endpoint** — No separate admin login page or API needed
2. **Phone numbers are unique** across BOTH tables — a phone cannot exist in both `users` and `admins`
3. **JWT token** contains `userType` ('USER' or 'ADMIN') and `role` (for admins only)
4. **Sessions** are stored in Redis with a 7-day TTL

---

## 3. User Registration & Login

### Register (Users Only)

`POST /api/auth/register`

```json
// Request
{
  "phone": "9876543210",
  "password": "myPassword1",
  "name": "Rahul Sharma"      // optional
}

// Success Response (201)
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "phone": "9876543210",
      "name": "Rahul Sharma",
      "profileComplete": false
    },
    "userType": "USER"
  }
}
```

**Validation rules:**
- `phone` — Must be exactly 10 digits, starting with 6-9 (Indian mobile number)
- `password` — Minimum 8 characters, must contain at least 1 digit
- Do **NOT** include `+91` or country code

> **Registration is for regular users only.** Admin accounts cannot be self-registered — they are created by Super Admins via the admin panel.

---

### Login (Both Users & Admins)

`POST /api/auth/login`

```json
// Request
{
  "phone": "9876543210",
  "password": "myPassword1"
}
```

#### If the phone belongs to a **regular user**:

```json
// Response (200)
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "550e8400-...",
      "phone": "9876543210",
      "name": "Rahul Sharma",
      "email": "rahul@example.com",
      "category": "STUDENT",
      "profileComplete": true,
      "address": { "city": "Mumbai", "state": "Maharashtra" }
    },
    "userType": "USER"
  }
}
```

#### If the phone belongs to an **admin**:

```json
// Response (200)
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "660e8400-...",
      "phone": "9999999999",
      "name": "Super Admin",
      "email": "admin@shasansetu.com",
      "role": "SUPER_ADMIN",
      "isActive": true
    },
    "userType": "ADMIN"
  }
}
```

**Critical differences in the response:**

| Field | User Login | Admin Login |
|---|---|---|
| `userType` | `"USER"` | `"ADMIN"` |
| `user.role` | ❌ Not present | `"ADMIN"` or `"SUPER_ADMIN"` |
| `user.isActive` | ❌ Not present | `true` / `false` |
| `user.profileComplete` | ✅ Present | ❌ Not present |
| `user.category` | ✅ Present | ❌ Not present |
| `user.address` | ✅ Present | ❌ Not present |

---

## 4. Admin Login

### How Admins Are Created

Admins are **NOT** promoted users. They are separate accounts:

```
Method 1: First Super Admin — manually inserted into the `admins` table (one-time)
Method 2: Subsequent Admins — created by a Super Admin via POST /api/admin/admins
```

The mobile app does **not** need to worry about creating admin accounts. That is handled via the admin panel (web) or the first-time database seed.

### Admin Login in the Mobile App

Use the **exact same** `POST /api/auth/login` endpoint. The server detects it automatically:

```dart
// The same login function works for both users and admins
final response = await api.post('/auth/login', {
  'phone': phoneController.text,
  'password': passwordController.text,
});

if (response['success'] == true) {
  final userType = response['data']['userType']; // "USER" or "ADMIN"
  final token = response['data']['token'];
  
  if (userType == 'ADMIN') {
    final role = response['data']['user']['role']; // "ADMIN" or "SUPER_ADMIN"
    // → Navigate to Admin Dashboard
  } else {
    // → Check profileComplete, navigate accordingly
  }
}
```

### Admin Permissions Summary

| Feature | ADMIN | SUPER_ADMIN |
|---|---|---|
| View Dashboard Stats | ✅ | ✅ |
| View & Process Orders | ✅ | ✅ |
| Manage Schemes (CRUD) | ✅ | ✅ |
| View All Users | ✅ | ✅ |
| Create/Edit/Deactivate Admins | ❌ | ✅ |
| View Admin List | ❌ | ✅ |

---

## 5. Session Management (JWT)

### Token Structure

The JWT payload contains:

```json
{
  "userId": "550e8400-...",
  "userType": "USER",         // or "ADMIN"
  "role": null,               // or "ADMIN" / "SUPER_ADMIN"
  "iat": 1708000000,
  "exp": 1708604800           // 7 days from issue
}
```

### Token Expiry
- Tokens expire after **7 days**
- Sessions are also stored in **Redis** (server-side) — if the Redis session is cleared (e.g., manual logout from another device), the token becomes invalid even if it hasn't expired

### Handling Token Expiry in Flutter

```dart
// On any API response
if (response.statusCode == 401) {
  final error = jsonDecode(response.body);
  if (error['error']['code'] == 'UNAUTHORIZED') {
    // Token expired or session invalidated
    // → Clear local storage
    // → Navigate to Login screen
    await secureStorage.delete(key: 'auth_token');
    await secureStorage.delete(key: 'user_data');
    navigatorKey.currentState?.pushReplacementNamed('/login');
  }
}
```

### Validating Session

`GET /api/auth/me`

Use this on app startup to verify the stored token is still valid:

```json
// Request Header: Authorization: Bearer <token>

// Response (200) — session valid
{
  "success": true,
  "data": {
    "userId": "550e8400-...",
    "userType": "USER",       // or "ADMIN"
    "role": null,             // or "ADMIN" / "SUPER_ADMIN"
    "phone": "9876543210",
    "email": "user@example.com",
    "name": "Rahul Sharma"
  }
}

// Response (401) — session expired/invalid
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Session expired. Please login again."
  }
}
```

### Logout

`POST /api/auth/logout`

This invalidates the Redis session. After logout, the token will return 401 on all endpoints.

---

## 6. Role-Based Access Control (RBAC)

### API Protection Layers

```
Public Endpoints (no auth required)
├── GET  /api/schemes              — List schemes
├── GET  /api/schemes/:slug        — Scheme details
└── POST /api/auth/login           — Login
└── POST /api/auth/register        — Register

User Endpoints (require: userType == "USER")
├── GET    /api/users/profile      — My profile
├── PATCH  /api/users/profile      — Update profile
├── GET    /api/orders             — My orders
├── GET    /api/orders/:id         — Order details
├── POST   /api/documents/upload-url  — Get upload URL
└── POST   /api/payments/create-order — Create payment

Admin Endpoints (require: userType == "ADMIN")
├── GET    /api/admin/stats        — Dashboard stats
├── GET    /api/admin/users        — List all users
├── GET    /api/admin/users/:id    — User details
├── GET    /api/orders/admin/queue — Admin order queue
├── PATCH  /api/orders/:id/status  — Update order status
└── POST   /api/orders/:id/complete — Complete order

Super Admin Endpoints (require: userType == "ADMIN" AND role == "SUPER_ADMIN")
├── GET    /api/admin/admins       — List all admins
├── POST   /api/admin/admins       — Create admin
├── PATCH  /api/admin/admins/:id   — Edit admin
└── PATCH  /api/admin/admins/:id/toggle-active — Activate/deactivate admin
```

### What Happens on 403

If a user tries to access an admin endpoint, or an admin tries to access a super admin endpoint:

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Admin access required"  // or "Super Admin access required"
  }
}
```

---

## 7. Flutter Implementation Guide

### 7.1 Recommended Auth Architecture

```
lib/
├── models/
│   ├── user_model.dart           # User data model
│   └── admin_model.dart          # Admin data model
├── services/
│   ├── api_service.dart          # HTTP client with auth headers
│   ├── auth_service.dart         # Login, register, logout, token mgmt
│   └── storage_service.dart      # Secure token storage
├── providers/  (or blocs/)
│   └── auth_provider.dart        # Auth state management
└── screens/
    ├── login_screen.dart         # Single login screen (handles both)
    ├── register_screen.dart      # User registration only
    ├── home/                     # User screens
    └── admin/                    # Admin screens
```

### 7.2 Data Models

```dart
// lib/models/auth_response.dart

class AuthResponse {
  final String token;
  final String userType;  // "USER" or "ADMIN"
  final Map<String, dynamic> user;
  
  AuthResponse({required this.token, required this.userType, required this.user});
  
  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    final data = json['data'];
    return AuthResponse(
      token: data['token'],
      userType: data['userType'],
      user: data['user'],
    );
  }
  
  bool get isAdmin => userType == 'ADMIN';
  bool get isSuperAdmin => isAdmin && user['role'] == 'SUPER_ADMIN';
  bool get isProfileComplete => !isAdmin && (user['profileComplete'] == true);
}
```

```dart
// lib/models/user_model.dart

class UserModel {
  final String id;
  final String phone;
  final String? email;
  final String? name;
  final String? category;
  final bool profileComplete;
  final Map<String, dynamic>? address;
  
  UserModel({
    required this.id,
    required this.phone,
    this.email,
    this.name,
    this.category,
    this.profileComplete = false,
    this.address,
  });
  
  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'],
      phone: json['phone'],
      email: json['email'],
      name: json['name'],
      category: json['category'],
      profileComplete: json['profileComplete'] ?? false,
      address: json['address'],
    );
  }
}
```

```dart
// lib/models/admin_model.dart

class AdminModel {
  final String id;
  final String phone;
  final String? email;
  final String name;
  final String role;      // "ADMIN" or "SUPER_ADMIN"
  final bool isActive;
  
  AdminModel({
    required this.id,
    required this.phone,
    this.email,
    required this.name,
    required this.role,
    required this.isActive,
  });
  
  bool get isSuperAdmin => role == 'SUPER_ADMIN';
  
  factory AdminModel.fromJson(Map<String, dynamic> json) {
    return AdminModel(
      id: json['id'],
      phone: json['phone'],
      email: json['email'],
      name: json['name'],
      role: json['role'],
      isActive: json['isActive'] ?? true,
    );
  }
}
```

### 7.3 Secure Token Storage

```dart
// lib/services/storage_service.dart
// Package: flutter_secure_storage

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';

class StorageService {
  static const _storage = FlutterSecureStorage();
  
  static const _tokenKey = 'auth_token';
  static const _userTypeKey = 'user_type';
  static const _userDataKey = 'user_data';
  
  // Save auth data after login
  static Future<void> saveAuth({
    required String token,
    required String userType,
    required Map<String, dynamic> userData,
  }) async {
    await _storage.write(key: _tokenKey, value: token);
    await _storage.write(key: _userTypeKey, value: userType);
    await _storage.write(key: _userDataKey, value: jsonEncode(userData));
  }
  
  // Read stored token
  static Future<String?> getToken() async {
    return await _storage.read(key: _tokenKey);
  }
  
  // Read stored user type
  static Future<String?> getUserType() async {
    return await _storage.read(key: _userTypeKey);
  }
  
  // Read stored user data
  static Future<Map<String, dynamic>?> getUserData() async {
    final data = await _storage.read(key: _userDataKey);
    if (data == null) return null;
    return jsonDecode(data);
  }
  
  // Clear all auth data (on logout)
  static Future<void> clearAuth() async {
    await _storage.deleteAll();
  }
}
```

### 7.4 API Service with Auth Headers

```dart
// lib/services/api_service.dart

import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  static const String baseUrl = 'https://your-api-domain.com/api';
  
  String? _token;
  
  void setToken(String token) => _token = token;
  void clearToken() => _token = null;
  
  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (_token != null) 'Authorization': 'Bearer $_token',
  };
  
  // Generic GET
  Future<Map<String, dynamic>> get(String path, {Map<String, String>? queryParams}) async {
    final uri = Uri.parse('$baseUrl$path').replace(queryParameters: queryParams);
    final response = await http.get(uri, headers: _headers);
    return _handleResponse(response);
  }
  
  // Generic POST
  Future<Map<String, dynamic>> post(String path, Map<String, dynamic> body) async {
    final response = await http.post(
      Uri.parse('$baseUrl$path'),
      headers: _headers,
      body: jsonEncode(body),
    );
    return _handleResponse(response);
  }
  
  // Generic PATCH
  Future<Map<String, dynamic>> patch(String path, Map<String, dynamic> body) async {
    final response = await http.patch(
      Uri.parse('$baseUrl$path'),
      headers: _headers,
      body: jsonEncode(body),
    );
    return _handleResponse(response);
  }
  
  Map<String, dynamic> _handleResponse(http.Response response) {
    final data = jsonDecode(response.body) as Map<String, dynamic>;
    
    // Handle 401 — token expired or session invalidated
    if (response.statusCode == 401) {
      // Emit an event or callback to trigger logout
      throw AuthExpiredException(data['error']?['message'] ?? 'Session expired');
    }
    
    return data;
  }
}

class AuthExpiredException implements Exception {
  final String message;
  AuthExpiredException(this.message);
}
```

### 7.5 Auth Service (Login/Register/Logout)

```dart
// lib/services/auth_service.dart

class AuthService {
  final ApiService _api;
  
  AuthService(this._api);
  
  /// Login — works for BOTH users and admins
  Future<AuthResponse> login(String phone, String password) async {
    final response = await _api.post('/auth/login', {
      'phone': phone,
      'password': password,
    });
    
    if (response['success'] != true) {
      throw Exception(response['error']?['message'] ?? 'Login failed');
    }
    
    final authResponse = AuthResponse.fromJson(response);
    
    // Store token and user data
    _api.setToken(authResponse.token);
    await StorageService.saveAuth(
      token: authResponse.token,
      userType: authResponse.userType,
      userData: authResponse.user,
    );
    
    return authResponse;
  }
  
  /// Register — for regular users ONLY (not admins)
  Future<AuthResponse> register(String phone, String password, {String? name}) async {
    final body = <String, dynamic>{
      'phone': phone,
      'password': password,
    };
    if (name != null && name.isNotEmpty) body['name'] = name;
    
    final response = await _api.post('/auth/register', body);
    
    if (response['success'] != true) {
      throw Exception(response['error']?['message'] ?? 'Registration failed');
    }
    
    final authResponse = AuthResponse.fromJson(response);
    _api.setToken(authResponse.token);
    await StorageService.saveAuth(
      token: authResponse.token,
      userType: authResponse.userType,
      userData: authResponse.user,
    );
    
    return authResponse;
  }
  
  /// Check if stored session is still valid (call on app startup)
  Future<AuthResponse?> restoreSession() async {
    final token = await StorageService.getToken();
    if (token == null) return null;
    
    _api.setToken(token);
    
    try {
      final response = await _api.get('/auth/me');
      if (response['success'] == true) {
        final userType = await StorageService.getUserType() ?? 'USER';
        return AuthResponse(
          token: token,
          userType: userType,
          user: response['data'],
        );
      }
    } on AuthExpiredException {
      // Session expired — clear local data
      await logout();
    }
    
    return null;
  }
  
  /// Logout — invalidates server session + clears local storage
  Future<void> logout() async {
    try {
      await _api.post('/auth/logout', {});
    } catch (_) {
      // Ignore errors — clear local data regardless
    }
    _api.clearToken();
    await StorageService.clearAuth();
  }
  
  /// Change password (works for both users and admins)
  Future<void> changePassword(String currentPassword, String newPassword) async {
    final response = await _api.post('/auth/change-password', {
      'currentPassword': currentPassword,
      'newPassword': newPassword,
    });
    
    if (response['success'] != true) {
      throw Exception(response['error']?['message'] ?? 'Password change failed');
    }
  }
}
```

### 7.6 App Startup & Navigation Logic

```dart
// In your main app or splash screen:

Future<void> initializeApp() async {
  final authResponse = await authService.restoreSession();
  
  if (authResponse == null) {
    // No valid session → show Login screen
    navigateTo('/login');
    return;
  }
  
  if (authResponse.isAdmin) {
    // Admin user → go to Admin Dashboard
    // Also store role for conditional UI
    navigateTo('/admin/dashboard');
  } else if (!authResponse.isProfileComplete) {
    // User with incomplete profile → go to Complete Profile
    navigateTo('/complete-profile');
  } else {
    // Regular user with complete profile → go to Home
    navigateTo('/home');
  }
}
```

### 7.7 Protecting Admin Screens in Flutter

```dart
// Route guard for admin screens

class AdminGuard extends StatelessWidget {
  final Widget child;
  final bool requireSuperAdmin;
  
  const AdminGuard({
    required this.child,
    this.requireSuperAdmin = false,
  });
  
  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    
    if (!authProvider.isAdmin) {
      return const AccessDeniedScreen(message: 'Admin access required');
    }
    
    if (requireSuperAdmin && !authProvider.isSuperAdmin) {
      return const AccessDeniedScreen(message: 'Super Admin access required');
    }
    
    return child;
  }
}

// Usage in routes:
GoRoute(
  path: '/admin/admins',
  builder: (context, state) => AdminGuard(
    requireSuperAdmin: true,  // Only Super Admins can see this
    child: const AdminManagementScreen(),
  ),
),
```

---

## 8. Admin Setup (First-Time Only)

### The Bootstrap Problem

When the system is first deployed, there are no admins in the database. The first Super Admin must be created manually.

### Step-by-Step: Create First Super Admin

**1. The backend team creates the first admin directly in the `admins` table:**

```sql
-- PostgreSQL — insert into the ADMINS table (NOT the users table)
INSERT INTO admins (id, phone, name, password_hash, role, is_active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '9999999999',
  'Super Admin',
  -- Generate hash using: node -e "const bcrypt = require('bcrypt'); bcrypt.hash('YourPassword1', 10).then(h => console.log(h))"
  '$2b$10$xxxxx...',
  'SUPER_ADMIN',
  true,
  NOW(),
  NOW()
);
```

**2. Now this Super Admin can log in** using the normal `POST /api/auth/login` with phone + password.

**3. After logging in as Super Admin,** they can create additional admins via the admin panel or the API:

```
POST /api/admin/admins
Authorization: Bearer <super_admin_token>

{
  "phone": "8888888888",
  "name": "Regular Admin",
  "password": "AdminPass1",
  "role": "ADMIN"
}
```

### ❌ Common Mistake to Avoid

> **DO NOT** register an admin using `POST /api/auth/register` and then update the `users` table. This creates the account in the **wrong table** (`users` instead of `admins`), and the auth middleware will treat them as a regular user.

---

## 9. API Quick Reference

### Authentication Endpoints

| Method | Endpoint | Auth | Who Can Use | Description |
|---|---|---|---|---|
| `POST` | `/auth/register` | ❌ | Anyone | Register new user |
| `POST` | `/auth/login` | ❌ | Anyone | Login (users + admins) |
| `GET` | `/auth/me` | ✅ | All authenticated | Validate session & get profile |
| `POST` | `/auth/logout` | ✅ | All authenticated | Invalidate session |
| `POST` | `/auth/change-password` | ✅ | All authenticated | Change password |

### User-Only Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/users/profile` | Get my full profile |
| `PATCH` | `/users/profile` | Update my profile |
| `GET` | `/orders` | My applications list |
| `GET` | `/orders/:id` | Application details |
| `POST` | `/documents/upload-url` | Get signed upload URL |
| `POST` | `/documents/:id/confirm-upload` | Confirm file upload |
| `GET` | `/documents/:id/download-url` | Get signed download URL |
| `POST` | `/payments/create-order` | Create Razorpay order |
| `POST` | `/payments/verify` | Verify Razorpay payment |

### Admin Endpoints (ADMIN or SUPER_ADMIN)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/stats` | Dashboard statistics |
| `GET` | `/admin/users` | List all registered users |
| `GET` | `/admin/users/:id` | Get user details |
| `GET` | `/admin/my-analytics` | My admin performance stats |
| `GET` | `/orders/admin/queue` | Admin order queue (paginated) |
| `PATCH` | `/orders/:id/status` | Update order status |
| `POST` | `/orders/:id/complete` | Mark order completed |

### Super Admin Endpoints (SUPER_ADMIN only)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/admins` | List all admin accounts |
| `POST` | `/admin/admins` | Create new admin |
| `PATCH` | `/admin/admins/:id` | Edit admin details |
| `PATCH` | `/admin/admins/:id/toggle-active` | Activate/deactivate admin |

---

## 10. Troubleshooting

### "401 Unauthorized" after login

**Cause:** Token is stale or Redis session was cleared.  
**Fix:** Clear stored token, navigate to login screen, and have the user log in again.

### "403 Forbidden — Admin access required"

**Cause:** The logged-in account exists in the `users` table, not the `admins` table.  
**Fix:** Admin accounts must be in the `admins` table. DO NOT try to add `role` to a regular user row. The admin must be created properly (see [Section 8](#8-admin-setup-first-time-only)).

### Admin can see dashboard but not "Manage Admins"

**Cause:** The admin has `role: "ADMIN"`, not `"SUPER_ADMIN"`. Only Super Admins can manage other admins.  
**Fix:** This is by design. Either promote the admin to SUPER_ADMIN in the database, or have an existing SUPER_ADMIN update their role via `PATCH /api/admin/admins/:id`.

### Login works but returns `userType: "USER"` for an admin

**Cause:** The admin was registered via `/api/auth/register` (which creates a record in the `users` table, not `admins`).  
**Fix:** Delete the entry from `users` table and create the admin properly in the `admins` table (see [Section 8](#8-admin-setup-first-time-only)).

### Token expires mid-session

**Cause:** JWT expires after 7 days, or Redis session was manually cleared.  
**Fix:** Implement the `AuthExpiredException` handler (see [Section 7.4](#74-api-service-with-auth-headers)) to catch 401 responses globally and redirect to login.

### Password validation fails

**Rules:**
- Minimum 8 characters
- Must contain at least 1 digit
- Both `currentPassword` and `newPassword` are required for change-password

---

> **Questions?** Contact the backend team for API access, environment URLs, and Razorpay test credentials.

---

*Guide authored for Shasan Seva Mobile App v1.0 — Flutter Development Team*
