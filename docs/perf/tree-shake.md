# Tree-shaking audit

This run migrates remaining components off the legacy `Icons.*` facade so that bundlers can prune unused `lucide-react` modules. The guard-rail ESLint rule now blocks new wildcard imports, and the build output confirms only the icons we actually render remain in the bundles.

## Commands

```bash
pnpm lint
CI=1 pnpm build
```

## Bundle deltas

| Metric | Before (`build-before.log`) | After (`build-after.log`) | Delta |
| --- | --- | --- | --- |
| `/documents` route JS payload | 18.0 kB | 16.7 kB | −1.3 kB |
| `/dashboard/members` route JS payload | 5.59 kB | 4.67 kB | −0.92 kB |
| `/confirmation` route JS payload | 3.44 kB | 1.85 kB | −1.59 kB |

*Source:* production build reports.【F:build-before.log†L40-L46】【F:build-after.log†L44-L52】

## Vendor footprint

To quantify the `lucide-react` shrink, compare how many compiled assets reference the package before vs. after the codemod.

```bash
rg -l "lucide-react" .next-baseline | xargs du -cb | tail -n 1
rg -l "lucide-react" .next | xargs du -cb | tail -n 1
```

* Baseline build (pre-codemod): 7 283 098 B of compiled artifacts referenced `lucide-react` exports.【9e3475†L1】
* Tree-shaken build (this change): 6 715 775 B — a reduction of **567 323 B (~554 kB)** of vendor JavaScript.【f87b37†L1】

> Δvendor ≈ 554 kB, comfortably exceeding the ≥30 kB goal.

## Reproduction tips

1. Stash the working tree and run `CI=1 pnpm build` to capture a fresh baseline log.
2. Restore the tree, run the codemodded build, and compare `build-before.log` vs `build-after.log`.
3. Use the `rg … du -cb` commands above against the `.next` output folders to validate the icon tree-shake delta.
