# Backend Fix Plan — Carousel Image Upload on PATCH Route

## The Problem

**Endpoint:** `PATCH /api/announcements/:id`  
**Symptom:** Returns `HTTP 500 INTERNAL_ERROR: "Failed to update announcement"` whenever the Flutter app tries to update a carousel slide with a new image.

**Root Cause:** The `PATCH /api/announcements/:id` route does **not** have `multer` middleware attached to it. When the Flutter app sends a `multipart/form-data` request (required for file uploads), Express cannot parse the body — `req.file` is `undefined`. The route handler then crashes when it tries to access the file, throwing an unhandled exception which results in the 500 response.

> [!NOTE]
> The `POST /api/announcements` create route works fine with images because it already has multer configured. This is only missing on the `PATCH` update route.

---

## Proof

| Request | Status | Works? |
|---------|--------|--------|
| `POST /api/announcements` with image (create) | ✅ 200 | Yes |
| `PATCH /api/announcements/:id` without image (JSON body) | ✅ 200 | Yes |
| `PATCH /api/announcements/:id` **with image** (multipart) | ❌ **500** | No |

The Flutter app debug log confirms:
```
HTTP Status  : 500
Raw Response : {success: false, error: {code: INTERNAL_ERROR, message: Failed to update announcement}}
FormData fields: [title, sortOrder]
FormData files : [image]   ← file IS being sent correctly from the app
```

---

## The Fix

### Step 1 — Find the PATCH route in your announcements router

Look in your Express router file (likely `routes/announcements.js` or `routes/announcements.ts`). Find the PATCH handler:

```javascript
// CURRENT CODE (broken — no multer)
router.patch('/:id', validateUpdateAnnouncement, updateAnnouncement);
```

### Step 2 — Add multer middleware to the PATCH route

Add the same `upload.single('image')` middleware that you already use on the POST route:

```javascript
// FIXED CODE
router.patch('/:id', upload.single('image'), validateUpdateAnnouncement, updateAnnouncement);
```

> [!IMPORTANT]
> The field name **must be `'image'`** — that is the field name the Flutter app uses when sending the file.

---

### Step 3 — Update the route handler to handle optional image

In your `updateAnnouncement` controller, make the image handling **optional** (not required), since users can update text without changing the image:

```javascript
// controllers/announcementController.js (or .ts)

async function updateAnnouncement(req, res) {
  try {
    const { id } = req.params;

    // Text fields come from req.body (parsed by multer)
    const { title, description, schemeId, sortOrder } = req.body;

    // Build update object — only include fields that were actually sent
    const updateData = {};
    if (title !== undefined)       updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (schemeId !== undefined)    updateData.schemeId = schemeId;
    if (sortOrder !== undefined)   updateData.sortOrder = Number(sortOrder); // convert string→number

    // req.file is set by multer ONLY when an image was uploaded
    if (req.file) {
      // Upload to your storage (S3 / Cloudinary / local disk)
      const imageUrl = await uploadImageToStorage(req.file); // your existing upload function
      updateData.imageUrl = imageUrl;
    }

    const announcement = await Announcement.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Announcement not found' },
      });
    }

    return res.json({ success: true, data: formatAnnouncement(announcement) });
  } catch (err) {
    console.error('[updateAnnouncement] Error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update announcement' },
    });
  }
}
```

---

### Step 4 — Check the validation middleware

Your Zod/Joi validation middleware for update (`validateUpdateAnnouncement`) runs **after** multer. Make sure it:

1. Does **NOT** require `type` in `req.body` — `type` is sent as a query param (`req.query.type`), not in the body
2. Treats all fields as **optional** (it's a partial update / PATCH)
3. Coerces `sortOrder` from string to number if needed (multer always provides strings in `req.body`)

**Example Zod schema for PATCH validation:**
```typescript
const updateAnnouncementSchema = z.object({
  body: z.object({
    title:       z.string().min(1).optional(),
    description: z.string().optional(),
    schemeId:    z.string().optional(),
    sortOrder:   z.string().transform(Number).optional(), // string from multipart
  }),
  query: z.object({
    type: z.enum(['CAROUSEL', 'MARQUEE']).optional(), // from query string
  }),
});
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `routes/announcements.js` | Add `upload.single('image')` to PATCH route |
| `controllers/announcementController.js` | Make `req.file` optional in update handler |
| `validators/announcementValidator.js` | Make all body fields optional; coerce `sortOrder` string→number |

---

## What the Flutter App Sends

For reference, the Flutter app sends this exact request on edit-with-image:

```
PATCH /api/announcements/{id}?type=CAROUSEL&title=Ladaki+Bahin+Yojana&sortOrder=1
Content-Type: multipart/form-data; boundary=...

--boundary
Content-Disposition: form-data; name="title"
Ladaki Bahin Yojana

--boundary
Content-Disposition: form-data; name="sortOrder"
1

--boundary
Content-Disposition: form-data; name="image"; filename="photo.jpg"
Content-Type: image/jpeg
<binary image data>
--boundary--
```

And for edit-without-image (JSON):
```
PATCH /api/announcements/{id}?type=CAROUSEL&title=Ladaki+Bahin+Yojana&sortOrder=1
Content-Type: application/json

{ "title": "Ladaki Bahin Yojana", "sortOrder": "1" }
```

> [!WARNING]
> The `sortOrder` field arrives as a **string** (`"1"`) in multipart/form-data (this is a limitation of the HTTP multipart spec — all fields are strings). Your handler must call `Number(req.body.sortOrder)` before saving to the database.
