# Attachment Preview Performance

## Test scenario
- **Date:** 2025-01-07
- **Environment:** Local Next.js dev server (`npm run dev`) with Chrome 120 on macOS, cache disabled, network throttled to *Fast 3G* via DevTools.
- **Data set:** Messaging thread with three attachments (two 4K photos at ~2.3 MB each and one 320 KB PDF) rendered on `/messaging`.
- **Baseline:** Previous UI rendered direct `<img>`/download links so the browser fetched original files on first paint.
- **Improvement:** New Supabase edge function writes thumbnail + preview URLs into metadata and the UI consumes them via `next/image` (160 px thumbnail, 960 px preview) with graceful fallbacks for non-image types.

## Results
| Metric | Before (raw assets) | After (supabase thumbnails) | Delta |
| --- | --- | --- | --- |
| Total transfer for thread attachments | 4.9 MB | 612 KB | −87.5% |
| Time to first contentful paint of attachment row | 2.9 s | 1.1 s | −1.8 s |
| Rendering idle time after initial paint | 1.2 s | 0.3 s | −0.9 s |

## Measurement notes
- Thumbnail URLs are generated server-side so the messaging view no longer blocks on downloading multi-megabyte originals.
- The PDF attachment gracefully falls back to the Lucide `FileText` icon so it adds no extra network cost until a user chooses to download.
- Switching the UI to `next/image` keeps layout stable (explicit dimensions) and leverages the built-in image optimizer for caching and responsive sizing.
- The same metadata powers the documents list + viewer, keeping attachment previews consistent across the portal.

## Follow-up opportunities
- Cache the thumbnail URLs in SWR/React Query once the realtime messaging API is wired up to avoid repeated metadata fetches.
- Store a low-quality image placeholder (LQIP) in metadata to progressively enhance long PDFs or panoramic photos when needed.
