# Image Delivery Guidelines

## Next.js image configuration
- We pin responsive breakpoints through `next.config.js` using:
  - `images.deviceSizes`: 360, 414, 640, 768, 1024, 1280, 1536
  - `images.imageSizes`: 16, 32, 48, 64, 96, 128, 256, 384, 640
- These values mirror our mobile-first breakpoints and allow the Image Optimization API to serve the closest asset size per device.

## Priority loading
- Reserve the `priority` flag for the single above-the-fold hero or marketing image on a page.
- Supporting or deferred imagery should rely on the default lazy-loading behaviour to conserve bandwidth.
- Hidden preloads (for dark/light swaps) should remain non-priority to avoid competing with the main hero request.

## `ResponsiveImage` component
- Use `components/media/ResponsiveImage` instead of importing `next/image` directly for marketing surfaces.
- The component ships shared defaults:
  - Sets a balanced `sizes` attribute for common layout widths.
  - Forces lazy loading unless `priority` is explicitly supplied.
  - Applies a sensible `w-full` baseline class while still allowing overrides.
- Example usage:

  ```tsx
  <ResponsiveImage
    src="/images/hero.jpg"
    alt="Roommates collaborating"
    width={2048}
    height={1365}
    priority
    className="size-full object-cover"
  />
  ```

Following these conventions keeps page weight low and ensures the highest-impact media renders immediately for tenants.
