# Mobile App — Carousel API Guide

> **For:** Mobile App Development Team  
> **Feature:** Admin-controlled intro carousel on app home screen  
> **Date:** April 2026

---

## Overview

The app home screen has an intro carousel showing featured schemes. Each slide has:
- **Title** (scheme name)
- **Description** (short text)
- **Background image** (optional — use fallback if absent)
- **Linked scheme** (tapping a slide navigates to the scheme detail page)

All carousel content is managed by admins via the web admin panel.

---

## API Endpoint

### `GET /api/announcements/public`

**Auth:** None (public, no token needed)

This is the same endpoint used by the website. The response includes a `carousel` key with enriched data specifically for the app.

### Response

```json
{
  "success": true,
  "data": {
    "marquee": [ ... ],
    "pills": [ ... ],
    "popularTags": [ ... ],
    "carousel": [
      {
        "id": "uuid-1",
        "type": "CAROUSEL",
        "title": "PM Kisan Samman Nidhi",
        "description": "Get ₹6000/year direct benefit transfer. Apply now!",
        "link": "/en/schemes/pm-kisan",
        "imageUrl": "https://<account>.r2.cloudflarestorage.com/.../carousel_bg_1709020800000.jpg?X-Amz-Signature=...",
        "sortOrder": 0,
        "createdAt": "2026-03-01T10:00:00.000Z",
        "scheme": {
          "id": "scheme-uuid",
          "name": "PM Kisan Samman Nidhi",
          "slug": "pm-kisan",
          "category": "FARMER",
          "description": "Government scheme providing income support...",
          "serviceFee": "199.00"
        }
      },
      {
        "id": "uuid-2",
        "type": "CAROUSEL",
        "title": "Free Ration Card Application",
        "description": "Apply for a new ration card online. Quick processing.",
        "imageUrl": null,
        "sortOrder": 1,
        "createdAt": "2026-03-15T10:00:00.000Z",
        "scheme": {
          "id": "scheme-uuid-2",
          "name": "Ration Card",
          "slug": "ration-card",
          "category": "OTHER",
          "description": "Apply for a new ration card...",
          "serviceFee": "149.00"
        }
      }
    ]
  }
}
```

---

## Carousel Item Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | `string (uuid)` | No | Unique carousel item ID |
| `type` | `string` | No | Always `"CAROUSEL"` |
| `title` | `string` | No | Display title for the slide |
| `description` | `string` | **Yes** | Short subtitle text (max 500 chars) |
| `link` | `string` | **Yes** | Optional web URL (not typically needed for app navigation) |
| `imageUrl` | `string` | **Yes** | Pre-signed R2 download URL for background image. **Expires after 15 minutes.** |
| `sortOrder` | `number` | No | Display order (lower = first) |
| `createdAt` | `string` | No | ISO timestamp |
| `scheme` | `object` | **Yes** | Linked scheme details (see below) |

### Scheme Object (nested)

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string (uuid)` | Scheme UUID — use for navigation |
| `name` | `string` | Scheme display name |
| `slug` | `string` | URL-friendly slug |
| `category` | `string \| null` | Category: `STUDENT`, `FARMER`, `LOAN`, `CERTIFICATE`, `JOBS`, `HEALTH`, `OTHER` |
| `description` | `string \| null` | Scheme description |
| `serviceFee` | `string` | Fee in INR (e.g., `"199.00"`) |

---

## Implementation Guide

### 1. Fetch carousel data

```kotlin
// Android — Retrofit
@GET("api/announcements/public")
suspend fun getAnnouncements(): AnnouncementsResponse

// Use response.data.carousel for the carousel
```

```swift
// iOS — URLSession
let url = URL(string: "\(baseURL)/api/announcements/public")!
let (data, _) = try await URLSession.shared.data(from: url)
let response = try JSONDecoder().decode(AnnouncementsResponse.self, from: data)
let carouselItems = response.data.carousel
```

```dart
// Flutter
final response = await http.get(Uri.parse('$baseUrl/api/announcements/public'));
final data = jsonDecode(response.body)['data'];
final carousel = data['carousel'] as List;
```

### 2. Display carousel

```
┌─────────────────────────────────────┐
│  ┌───────────────────────────────┐  │
│  │     Background Image          │  │
│  │                               │  │
│  │     Title                     │  │
│  │     Description               │  │
│  │                     ► Apply   │  │
│  └───────────────────────────────┘  │
│           ● ○ ○  (page dots)        │
└─────────────────────────────────────┘
```

### 3. Handle background image

```
if (item.imageUrl != null) {
    // Load from imageUrl (pre-signed, expires in 15 min)
    // Use your image loading library (Glide/Coil/Kingfisher/cached_network_image)
    loadImage(item.imageUrl)
} else {
    // Show fallback/default gradient or placeholder image
    showFallbackImage()
}
```

> ⚠️ **Image URL expiry:** The `imageUrl` is a pre-signed URL that expires after **15 minutes**. If the app is backgrounded for a long time, re-fetch the announcements endpoint before displaying stale images. In practice, this is fine for most use cases since the carousel is on the home screen and data is fetched on screen load.

### 4. Handle navigation (tap)

When user taps a carousel slide:

```
if (item.scheme != null) {
    // Navigate to scheme detail screen using scheme.id or scheme.slug
    navigateToSchemeDetail(item.scheme.id)
    // or: navigateToSchemeDetail(item.scheme.slug)
}
```

The scheme detail page can be loaded via:
```
GET /api/schemes/{slug}?locale=en
```
(Documented in main API_DOCUMENTATION.md)

### 5. Empty state

If `carousel` array is empty, hide the carousel section or show a static fallback slide.

---

## Caching Recommendations

| Strategy | Approach |
|----------|----------|
| **API response** | Cache for 5–10 minutes, refresh on pull-to-refresh |
| **Images** | Use disk caching (Glide/Kingfisher handle this automatically) |
| **Offline** | Store last successful response in local DB/SharedPrefs for offline display |

---

## Data Model (for local storage)

```typescript
interface CarouselItem {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  scheme: {
    id: string;
    name: string;
    slug: string;
    category: string | null;
    description: string | null;
    serviceFee: string;
  } | null;
}
```

---

## Admin Management

Admins manage carousel slides from the **web admin panel** at `/admin/announcements`. They can:
- Create a new carousel slide (pick a scheme, upload bg image, set title/description)
- Toggle slides active/inactive
- Reorder slides via `sortOrder`
- Delete slides (also removes the bg image from storage)

The app team does **not** need to implement any admin functionality — just consume the public API.

---

## FAQ

**Q: How many slides should we show?**  
A: Show all items in the `carousel` array. Admin controls what's active. Typically 3–5 slides.

**Q: What if a scheme is deleted but the carousel item still references it?**  
A: The `scheme` object will be `null`. Show the slide with just the title/description (no navigation) or hide it.

**Q: Do we need auth for this endpoint?**  
A: No. `GET /api/announcements/public` is fully public.

**Q: Image loading fails — what do we do?**  
A: Show the fallback image. The pre-signed URL may have expired. On next screen load, fresh URLs will be generated.

---

*API Guide v1.0 — ShasanSeva Mobile Carousel*
