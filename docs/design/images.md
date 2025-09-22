# Image Guidelines

## Core principles
- Use Next.js [`<Image />`](https://nextjs.org/docs/app/api-reference/components/image) instead of native `<img>` tags in the `app/` and `components/` directories. This unlocks automatic optimization, lazy loading, and format negotiation.
- Always provide explicit `width`, `height`, and `sizes` values. These attributes prevent cumulative layout shift and make responsive rendering predictable.
- Author descriptive `alt` text that conveys the intent of the asset. Reserve empty `alt` text (`""`) for decorative images only when they add no informational value.

## Layout sizing guidance
- Match the `sizes` attribute to the layout breakpoints. For example, a half-width image in desktop layouts can use `sizes="(min-width: 768px) 50vw, 100vw"`, while fixed avatars can use pixel lengths like ``sizes="48px"``.
- When an image should stretch to its container, opt into the `fill` layout and ensure the wrapping element sets a deterministic aspect ratio (via Tailwind `aspect-[w/h]` utilities or explicit inline styles).
- Prefer the newly created `components/mdx/image.tsx` helper (`MdxImage`) for consistent defaults and guardrails. It enforces the presence of dimensions during development to catch mistakes early.

### Example (React components)
```tsx
import Image from "next/image"

export function HouseholdHero() {
  return (
    <Image
      src="/images/household-hero.avif"
      width={1600}
      height={900}
      sizes="(min-width: 1024px) 960px, 100vw"
      alt="Roommates collaborating in their shared workspace"
      priority
    />
  )
}
```

## MDX content
- Markdown images (`![alt](path)`) and raw `<img>` tags render through `MdxImage`, which wraps `next/image`. Supply `width`, `height`, and `sizes` so the optimizer can calculate responsive breakpoints.
- When you need advanced props (e.g., `priority`, custom `className`), use JSX directly inside MDX:

```mdx
<Image
  src="/images/design/system.webp"
  width={1024}
  height={768}
  sizes="(min-width: 1280px) 960px, (min-width: 768px) 80vw, 100vw"
  alt="Share House portal component library overview"
  className="rounded-xl shadow-lg"
/>
```

## Formats and sourcing
- Prefer modern formats (AVIF, WebP) where possible. `next.config.js` enables both, allowing the Image component to serve the most efficient variant supported by the browser.
- Source assets from the approved domains listed in `next.config.js`. For new remote providers, add them to the `images.remotePatterns` array before shipping code.
- For user-generated content (e.g., Supabase Storage avatars), validate the uploaded MIME type so unsupported formats never reach the optimizer.

## Accessibility and performance checklist
- Confirm every image includes purposeful `alt` text and, when applicable, `aria-hidden="true"` on decorative wrappers.
- Use the `priority` prop sparingly—reserve it for above-the-fold hero art and critical logos.
- Avoid oversized assets. Resize and compress media before committing it to `public/` or remote storage to keep the payload slim.
- Run `pnpm lint` locally after touching image-heavy surfaces. ESLint will catch any stray `<img>` usage or missing alt text in JSX.
