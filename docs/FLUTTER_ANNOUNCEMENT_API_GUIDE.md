# Announcement API Guide — For Flutter Team

> **Base URL:** `https://api.shasanseva.in`  
> **Auth:** All admin endpoints require `Authorization: Bearer <jwt_token>` header.

---

## Overview

The announcement system uses **presigned URLs** for image uploads. This is a 2-step process:

```
Step 1: Get presigned upload URL from the API
Step 2: PUT the image directly to cloud storage (R2)
Step 3: Send the returned `key` to create/update the announcement
```

**DO NOT** send images as multipart/form-data directly to the announcement endpoints. The API expects JSON bodies only.

---

## API Endpoints

### 1. Upload Carousel Image

Get a presigned URL to upload an image to cloud storage.

```
POST /api/announcements/upload-image
Content-Type: application/json
Authorization: Bearer <token>

{
  "contentType": "image/jpeg"    // or "image/png" or "image/webp"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://r2-storage.example.com/signed-url...",
    "key": "users/admin/documents/carousel_bg_1712000000.jpg",
    "expiresIn": 300
  }
}
```

**Then upload the image file directly to R2:**
```
PUT <uploadUrl>
Content-Type: image/jpeg

<raw image bytes>
```

> [!IMPORTANT]
> The `uploadUrl` expires in **5 minutes**. Upload immediately after receiving it.
> The `key` is what you pass to create/update endpoints as `imageKey`.

---

### 2. Create Announcement

```
POST /api/announcements
Content-Type: application/json
Authorization: Bearer <token>

{
  "type": "CAROUSEL",                                           // required: MARQUEE | PILL | POPULAR_TAG | CAROUSEL
  "title": "Ladaki Bahin Yojana",                              // required: string (1-255 chars)
  "description": "Apply now for benefits",                     // optional: string (max 500 chars)
  "link": "https://example.com",                               // optional: string (max 500 chars)
  "imageKey": "users/admin/documents/carousel_bg_1712000000.jpg",  // optional: the key from upload-image
  "schemeId": "uuid-of-scheme",                                // optional: links carousel to a scheme
  "isActive": true,                                            // optional: default true
  "sortOrder": 1                                               // optional: integer, default 0
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "d2a06aaa-1984-4b31-88ed-9d3d8defae5f",
    "type": "CAROUSEL",
    "title": "Ladaki Bahin Yojana",
    "description": "Apply now for benefits",
    "imageKey": "users/admin/documents/carousel_bg_1712000000.jpg",
    "imageUrl": "https://signed-download-url...",
    "schemeId": "uuid-of-scheme",
    "isActive": true,
    "sortOrder": 1,
    "createdAt": "2026-04-09T12:00:00.000Z"
  }
}
```

---

### 3. Update Announcement (PATCH)

> [!WARNING]
> - Send **only the fields you want to change**
> - Send as `application/json` — NOT multipart/form-data
> - The body must contain **at least one field** or you'll get a 400 error
> - `sortOrder` must be a **number** (not a string)

```
PATCH /api/announcements/:id
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "Updated Title",
  "sortOrder": 2
}
```

**To update the image**, follow the 2-step flow:

```
1. POST /api/announcements/upload-image  →  get new `key`
2. PATCH /api/announcements/:id          →  send { "imageKey": "new-key" }
```

The API will automatically:
- Generate a new download URL for the new image
- Delete the old image from storage

**To remove an image without replacement:**
```json
{
  "imageKey": null
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "d2a06aaa-...",
    "title": "Updated Title",
    "sortOrder": 2,
    "imageKey": "users/admin/documents/carousel_bg_1712000000.jpg",
    "imageUrl": "https://signed-download-url..."
  }
}
```

**Error — empty body (400):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "No fields to update"
  }
}
```

---

### 4. List All Announcements (Admin)

```
GET /api/announcements
Authorization: Bearer <token>
```

Returns all announcements (active and inactive), sorted by `sortOrder`.

---

### 5. Get Public Announcements

```
GET /api/announcements/public
```

No auth required. Returns only active announcements grouped by type:

```json
{
  "success": true,
  "data": {
    "marquee": [...],
    "pills": [...],
    "popularTags": [...],
    "carousel": [
      {
        "id": "...",
        "type": "CAROUSEL",
        "title": "Ladaki Bahin Yojana",
        "description": "...",
        "imageUrl": "https://signed-download-url...",
        "sortOrder": 1,
        "scheme": {
          "id": "...",
          "name": "Ladaki Bahin Yojana",
          "slug": "ladaki-bahin-yojana",
          "category": "WOMEN",
          "description": "...",
          "serviceFee": "299"
        }
      }
    ]
  }
}
```

> [!NOTE]
> The `imageUrl` in carousel items is a **signed URL that expires in 15 minutes**.
> Always use the URL immediately or refetch `/api/announcements/public` when displaying.

---

### 6. Delete Announcement

```
DELETE /api/announcements/:id
Authorization: Bearer <token>
```

Automatically cleans up the image from storage if one exists.

---

## Complete Flutter Flow — Create Carousel with Image

```dart
// Step 1: Get presigned upload URL
final uploadRes = await http.post(
  Uri.parse('$baseUrl/api/announcements/upload-image'),
  headers: {'Authorization': 'Bearer $token', 'Content-Type': 'application/json'},
  body: jsonEncode({'contentType': 'image/jpeg'}),
);
final uploadData = jsonDecode(uploadRes.body)['data'];
final String uploadUrl = uploadData['uploadUrl'];
final String imageKey = uploadData['key'];

// Step 2: Upload image bytes directly to R2
final imageBytes = await File('photo.jpg').readAsBytes();
await http.put(
  Uri.parse(uploadUrl),
  headers: {'Content-Type': 'image/jpeg'},
  body: imageBytes,
);

// Step 3: Create announcement with the image key
final createRes = await http.post(
  Uri.parse('$baseUrl/api/announcements'),
  headers: {'Authorization': 'Bearer $token', 'Content-Type': 'application/json'},
  body: jsonEncode({
    'type': 'CAROUSEL',
    'title': 'Ladaki Bahin Yojana',
    'imageKey': imageKey,       // ← the key from step 1
    'schemeId': 'scheme-uuid',
    'sortOrder': 1,
  }),
);
```

## Complete Flutter Flow — Update Carousel Image

```dart
// Step 1: Get new presigned upload URL
final uploadRes = await http.post(
  Uri.parse('$baseUrl/api/announcements/upload-image'),
  headers: {'Authorization': 'Bearer $token', 'Content-Type': 'application/json'},
  body: jsonEncode({'contentType': 'image/jpeg'}),
);
final uploadData = jsonDecode(uploadRes.body)['data'];

// Step 2: Upload new image
await http.put(
  Uri.parse(uploadData['uploadUrl']),
  headers: {'Content-Type': 'image/jpeg'},
  body: newImageBytes,
);

// Step 3: PATCH announcement with new key (old image is auto-deleted)
await http.patch(
  Uri.parse('$baseUrl/api/announcements/$announcementId'),
  headers: {'Authorization': 'Bearer $token', 'Content-Type': 'application/json'},
  body: jsonEncode({
    'imageKey': uploadData['key'],   // ← new key
    'title': 'Updated Title',       // ← optional: include other fields to update
  }),
);
```

## Complete Flutter Flow — Update Without Image Change

```dart
// Just send JSON with the fields to update — no upload needed
await http.patch(
  Uri.parse('$baseUrl/api/announcements/$announcementId'),
  headers: {'Authorization': 'Bearer $token', 'Content-Type': 'application/json'},
  body: jsonEncode({
    'title': 'New Title',
    'sortOrder': 2,
  }),
);
```

---

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `400 VALIDATION_ERROR: No fields to update` | PATCH body is empty `{}` | Include at least one field to update |
| `500 INTERNAL_ERROR` on PATCH | Sending multipart/form-data | Use `Content-Type: application/json` instead |
| `404 NOT_FOUND: Scheme not found` | Invalid `schemeId` | Verify scheme exists before creating carousel |
| Upload URL expired | Took > 5 min to upload | Request a new upload URL |

---

## Field Reference

| Field | Type | Create | Update | Notes |
|-------|------|--------|--------|-------|
| `type` | `MARQUEE \| PILL \| POPULAR_TAG \| CAROUSEL` | Required | Optional | |
| `title` | string (1-255) | Required | Optional | |
| `description` | string (max 500) | Optional | Optional | Send `null` to clear |
| `link` | string (max 500) | Optional | Optional | Send `null` to clear |
| `imageKey` | string | Optional | Optional | From upload-image endpoint. Send `null` to remove image |
| `schemeId` | UUID string | Optional | Optional | Links carousel to a scheme. Send `null` to unlink |
| `isActive` | boolean | Optional (default: true) | Optional | |
| `sortOrder` | integer | Optional (default: 0) | Optional | **Must be a number, not a string** |
