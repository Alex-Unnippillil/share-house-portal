# Tailwind CSS Purge & Bundle Monitoring

This project enforces a repeatable purge workflow so we can ship lean CSS bundles.
Tailwind's JIT engine scans our template directories (App Router routes, shared
components, MDX content, hooks, utilities, and supporting libraries) and the
purged result is verified in both local development and CI.

## Running the purge locally

1. Install dependencies (`npm install`, `pnpm install`, or `yarn install`).
2. Run `npm run css:purge` (or the equivalent command for your package manager).
3. The script invokes the Tailwind CLI against `app/globals.css` with the
   production content globs from `tailwind.config.js`, writes the purged bundle
   to a temporary directory, and reports the compressed size.
4. Builds fail when the bundle exceeds the default 90&nbsp;kB limit. Set
   `CSS_BUNDLE_MAX_KB` to override the guardrail for experiments:

   ```bash
   CSS_BUNDLE_MAX_KB=110 npm run css:purge
   ```

5. Use `TAILWIND_INPUT_CSS` or `TAILWIND_CONFIG_PATH` to point the script at
   alternate entrypoints or configuration files when debugging bespoke CSS.

## CI enforcement

The `css-size` GitHub Actions workflow runs on every push and pull request:

- installs dependencies,
- executes `npm run css:purge` with the 90&nbsp;kB ceiling, and
- posts the resulting bundle size to the workflow summary so regressions are
  easy to spot during code review.

Builds fail automatically when the purged output grows beyond the threshold.
Adjustments to the ceiling should be intentional and documented alongside the
change that requires the extra budget.

## Safelisting guidance

Dynamic class names (for example, values assembled from data or persisted in a
CMS) must be registered explicitly so they survive the purge:

```ts
// tailwind.config.js
const config = {
  // ...
  safelist: [
    {
      pattern: /^(bg|text|border)-brand-(100|500|900)$/,
      variants: ["hover", "dark"],
    },
    "animate-in",
  ],
} as const
```

Keep safelists as small and targeted as possible—prefer regex patterns over long
literal arrays, and scope variants (`hover`, `sm`, `dark`, etc.) to only what is
required. Document any new safelist entries in this file so reviewers understand
why they are necessary and how they impact the bundle budget.
