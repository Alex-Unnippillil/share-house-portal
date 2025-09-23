# Accessibility Media Preference Support

This update ensures the Share House Portal honours users' motion and contrast preferences across interactive surfaces.

## Prefers Reduced Motion

- `hooks/use-prefers-reduced-motion.ts` provides a shared hook that checks the `prefers-reduced-motion` media query inside a `useEffect`, updating state on changes.
- `app/about/page.tsx` now disables Framer Motion transitions when the preference is enabled so the section content renders instantly.
- `components/feature-prism.tsx` introduces a motion preference context that removes auto-rotation, particle movement, and rapid emissive flicker across the 3D scene when reduced motion is requested. Visual elements remain visible with toned-down static styling.

### Testing

1. Start the Next.js dev server (`pnpm dev`).
2. Open Chrome DevTools and switch to **More tools → Rendering**.
3. Enable **Emulate CSS media feature prefers-reduced-motion: reduce**.
4. Reload the About page and the Feature Prism demo—transitions should be removed, and the 3D visual remains static without animated trails.
5. Toggle the emulation back to `no-preference` to restore animations.

## Prefers Contrast

- `app/globals.css` defines high-contrast and low-contrast token overrides that adjust the primary, secondary, accent, border, and text colours for both light and dark themes.

### Testing

1. In Chrome DevTools Rendering tab, enable **Emulate CSS media feature prefers-contrast: more** to verify the brighter highlights and darker text.
2. Switch to **prefers-contrast: less** to confirm muted colour palettes.
3. Repeat the checks with the site in dark mode to confirm both themes respond.

These steps mirror what assistive technology users experience when their OS accessibility settings request reduced motion or a specific contrast level.
