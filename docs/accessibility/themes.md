# Theme accessibility guidelines

The portal now ships three display modes powered by `next-themes`:

- **Light**: default experience tuned for daylight readability.
- **Dark**: low-light option aligned to the original palette.
- **High contrast**: WCAG AAA-focused palette for residents who need additional visual separation.

## Color token reference

All design tokens live in `app/globals.css` as CSS custom properties. Each theme maps the shared semantic tokens (`--background`, `--foreground`, etc.) to the appropriate palette values, so component code should continue to rely on semantic utilities such as `bg-background`, `text-foreground`, `bg-primary`, and `text-muted-foreground`.

For the high-contrast mode we additionally expose the `--hc-*` tokens and Tailwind aliases (`theme("colors.highContrast.*")`) to support edge cases where a component must reference the palette directly.

| Token | Purpose | High contrast value |
| --- | --- | --- |
| `--background` | Application chrome | `hsl(222 87% 8%)` |
| `--foreground` | Primary body copy | `hsl(210 40% 98%)` |
| `--primary` | Calls to action / payment CTAs | `hsl(50 100% 56%)` |
| `--secondary` | Informational badges | `hsl(196 100% 58%)` |
| `--accent` | Messaging chips & status tags | `hsl(142 80% 52%)` |
| `--destructive` | Error states & destructive buttons | `hsl(0 100% 75%)` |
| `--muted-foreground` | Metadata & timestamps | `hsl(210 35% 88%)` |

## Usage checklist

1. **Prefer semantic utilities**: reach for `bg-secondary` + `text-secondary-foreground` or `text-muted-foreground` instead of hard-coded colors. This ensures all three themes stay in sync.
2. **Respect minimum contrast**: the automated audit in `tests/accessibility/contrast.test.ts` enforces WCAG AA for light/dark themes and AAA for the high-contrast palette. Add new token pairs to that test when creating novel combinations.
3. **Iconography**: icons inside buttons should inherit the text color (`text-current`) so they follow the active theme. Avoid embedding raw hex values inside SVGs.
4. **Gradients and illustrations**: when absolutely necessary, wrap non-compliant artwork with `aria-hidden` and provide accessible text alternatives.
5. **Persistence**: the theme toggle stores the user’s selection under `share-house-theme`. Respect this key when building import/export utilities so resident preferences travel with backups.

## Manual audit tips

- Exercise payments, documents, and messaging surfaces in all three modes whenever adding new components. Look for focus rings, subtle dividers, and badge text.
- Confirm that error banners use the updated dark-theme destructive foreground (`--destructive-foreground: hsl(222 47% 11%)`) to stay legible on brighter reds.
- When introducing new palettes (e.g., seasonal themes), start from the semantic token map rather than redefining component styles in isolation.
