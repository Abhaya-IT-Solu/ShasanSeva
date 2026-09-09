# `sourceUrl` on schemes — for the app team

Answering the open question in the Play Store fix plan.

## The short version

> **Does the backend include an official government source URL per scheme?**

It does **now**. It did not when you asked — there was no such field anywhere.

`sourceUrl` is live on every scheme endpoint, matching the name your
`scheme_model.dart` already maps from, so no change is needed on your side beyond
reading it.

```json
{
  "id": "…",
  "slug": "post-matric-scholarship",
  "name": "Post Matric Scholarship",
  "serviceFee": "500.00",
  "sourceUrl": "https://mahadbt.maharashtra.gov.in/scheme/…"
}
```

Present on:

| Endpoint | Notes |
|---|---|
| `GET /api/schemes` | list |
| `GET /api/schemes/:slug` | public detail |
| `GET /api/schemes/by-id/:id` | admin detail |

## The one rule that matters

**`sourceUrl` is nullable, and when it is null you must render nothing.**

Do not fall back to `india.gov.in`, `mahadbt.maharashtra.gov.in`, or any other
generic portal. The plan proposed that as the "if NO" branch and it was
deliberately rejected: presenting a portal that does not document *that specific
scheme* as its official source is a stronger misleading claim than showing no
source at all — which is the exact policy you were flagged under. A reviewer who
taps through and cannot find the scheme is a worse outcome than an absent card.

```dart
if (scheme.sourceUrl != null && scheme.sourceUrl!.isNotEmpty) {
  // render the Official Government Source card
}
// else: render nothing. No fallback.
```

The disclaimer banner is unconditional — it shows regardless.

## Expect nulls at first

The column exists but the data is being backfilled by hand, one scheme at a time.
Until that is done most schemes return `null`, so **build and test the null path
first** — it is the one a reviewer is most likely to hit right now.

The admin panel flags government schemes with no URL, so the gap is visible and
shrinking, but do not assume any given scheme has one.

## What is guaranteed

- Absolute `https://` URL, max 500 characters — validated on write, so you do not
  need to sanitise before handing it to `url_launcher`
- Never a relative path and never an R2 key, unlike `logoUrl` and
  `referenceImageUrl`, which *are* keys resolved server-side
- The host is **not** guaranteed to be `.gov.in`. The admin UI warns on anything
  else but does not block it, because some legitimate state portals sit on other
  domains. Do not validate the host in the app.

## Website parity

The same card and an always-visible "not a government entity" banner are now on
the web scheme detail page, and that sentence is in the site footer on every
page in both English and Marathi. Worth keeping the app wording close to it so
the two do not drift — a reviewer may well look at both.
