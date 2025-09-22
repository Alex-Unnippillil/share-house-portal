# Image Authoring Guidelines

These conventions help us keep media performant, accessible, and consistent with the Share House Portal design system.

## Components

- Always render product imagery through [`<ResponsiveImage>`](../../components/media/responsive-image.tsx). The wrapper enables blur placeholders, responsive `sizes`, and automatic fallbacks for `blob:`/`data:` URLs.
- Supply an explicit `width` and `height` (or `fill`) along with an accurate `alt` description. This prevents layout shifts and keeps assets eligible for Next.js optimization.
- When an image is the primary visual above the fold (e.g. hero art or dashboard hero cards), set `priority` to surface it as the Largest Contentful Paint (LCP) candidate and allow the browser to preload.
- Prefer modern formats (AVIF or WebP) exported at source; the Next.js optimizer will honour these where available and transparently fall back to JPEG/PNG.
- Set contextual `sizes` when an image is not full width—for example `sizes="(min-width: 768px) 50vw, 100vw"` for side-by-side layouts.

## MDX Content

- Plain `<img>` tags inside MDX are automatically swapped with `<MdxImage>`, so Markdown authors can continue using standard syntax while inheriting the responsive behaviour.
- Include `width` and `height` attributes in MDX (e.g. `<img src="/images/example.jpg" alt="Amenity schedule" width={1280} height={720} />`) to preserve aspect ratio.
- For callouts that must load quickly, add `priority` or a custom `sizes` string via JSX attributes.

## Performance & LCP Expectations

- Optimized responses from `/_next/image` are cached at the CDN layer for one year with immutable directives. Avoid reusing filenames for different assets so cache invalidation remains predictable.
- Aim for an LCP below **2.5 s on mid-tier mobile** (Fast 3G) and **<1.5 s on desktop**. Keep hero imagery under ~200 KB whenever possible and serve appropriately scaled variants via the provided `sizes` presets.
- Use lazy loading (the default behaviour) for content below the fold and reserve `priority` for a single, critical hero image per route.

## Source Management

- Stick to the allowlisted hosts declared in `next.config.js` for remote assets. Add new domains explicitly before using them in components or MDX content.
- Store frequently reused imagery in `public/images/` with descriptive names; dynamic or user-generated media should remain in Supabase storage.
- Document attribution and licensing for third-party imagery alongside the asset or within the relevant MDX section.
