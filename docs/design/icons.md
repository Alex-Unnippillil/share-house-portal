# Icon Strategy

This project renders icons through a centralized sprite and a shared `<Icon>` component. The approach keeps SVG markup consistent, reduces duplicate imports, and makes it easy to inline bespoke assets when needed.

## Using icons in components

- Render icons by importing the helper and referencing the desired symbol.

  ```tsx
  import { Icon } from "@/components/icons"

  export function Example() {
    return <Icon name="sparkles" className="size-4 text-primary" />
  }
  ```

- The component forwards `className`, `aria-*`, and other SVG props. Provide a `title` when the icon should be announced by assistive technology; otherwise it defaults to `aria-hidden`.
- Inline-only assets (for example, the spinner or product logo) are referenced by name exactly like sprite icons.

## Sprite and inline manifests

`components/icons.tsx` exposes two registries:

- `spriteManifest` lists Lucide icons that are exported into the sprite. Each entry maps a `name` to a Lucide component. On build the component collects those glyphs into a single `<symbol>` definition that is injected once via `<IconSprite />` (rendered in `app/layout.tsx`).
- `inlineIcons` contains custom SVGs that should remain embedded (e.g., logos, social marks, the loading spinner). Use `createInlineIcon` to wrap the SVG markup and expose it through the same API surface.

When adding a new icon:

1. Prefer an existing Lucide glyph. Import it in `components/icons.tsx`, add it to `spriteManifest`, and reference the new `name` via `<Icon name="..." />`.
2. If no suitable Lucide icon exists, add an entry to `inlineIcons` with the raw SVG path data. Limit inline assets to small bespoke icons; larger sets should live in the sprite.
3. Confirm the chosen `name` is unique—TypeScript will flag duplicates thanks to the manifest typings.

## Maintenance checklist

- Keep `@radix-ui/react-icons` and `react-icons` dependencies out of the project; all usage should flow through the shared sprite helpers.
- When Lucide publishes new icons you want to adopt, bump the `lucide-react` version and extend the manifest accordingly.
- After modifying the manifests, run `pnpm install` or `npm install` to update lockfiles if dependencies change, then run lint/tests to ensure nothing else regressed.
- Spot-check interactive surfaces (dropdowns, toasts, menus) whenever sprite entries are added or removed to confirm the `<IconSprite />` markup is still included on the page.

