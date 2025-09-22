# Navigation Prefetching Guidelines

Roomsily ships a custom [`SmartLink`](../../components/navigation/SmartLink.tsx) wrapper around Next.js `Link` to keep navigation responsive without wasting bandwidth. The component exposes lightweight heuristics so that we only prefetch routes when a tenant is likely to visit them soon.

## Heuristics at a glance

- **Visibility aware:** Links marked with the default `intent="standard"` will begin prefetching once they near the viewport (200px root margin). Hovering or focusing the link will also trigger a warm up.
- **High intent CTAs:** Set `intent="critical"` for the primary actions on a surface (e.g. hero CTAs). These routes prefetch immediately on mount and on interaction.
- **Dense navigation clusters:** Use `intent="navigation"` for elements inside menus, tabular data, footers, or anywhere we render many links at once. This disables automatic viewport prefetching so we only prefetch when someone hovers or focuses the link.
- **Passive or low intent links:** `intent="passive"` skips the intersection observer and waits for hover/focus before prefetching. Handy for tertiary links, legal copy, or long lists of resources.

All intents can still be overridden by passing the native `prefetch` prop directly when a component needs bespoke behaviour.

## Usage examples

```tsx
import SmartLink from "@/components/navigation/SmartLink"

function HeroCtas() {
  return (
    <div className="flex gap-4">
      <SmartLink href="/auth" intent="critical" className="btn-primary">
        Sign in
      </SmartLink>
      <SmartLink href="/onboarding" intent="critical" className="btn-secondary">
        Create your household
      </SmartLink>
    </div>
  )
}

function FooterNav() {
  return (
    <nav className="grid gap-2 text-sm">
      <SmartLink href="/payments" intent="navigation">
        Rent payments
      </SmartLink>
      <SmartLink href="/documents" intent="navigation">
        Document vault
      </SmartLink>
    </nav>
  )
}
```

## Migration checklist

1. **Use `SmartLink` instead of `next/link`** for any internal navigation within the portal.
2. **Tag dense link zones** (`nav`, `table`, multi-column lists) with `intent="navigation"` so we do not prefetch every entry on initial paint.
3. **Promote the primary action** with `intent="critical"` when immediate navigation is desirable.
4. **Fallback to `intent="passive"`** for legal or tertiary references that the tenant is unlikely to click.
5. **Leave external URLs as `<a>` elements.** `SmartLink` automatically skips prefetching for external, hash, mailto, and tel targets.

Following these rules keeps the dashboard fast for roommates on slower networks while still providing instant transitions for the actions that matter most.
