# Typography Strategy

## Overview
The application uses a self-hosted font stack to guarantee consistent rendering, remove external network dependencies, and keep font loading under our direct control. Font assets live in `public/fonts/` and are referenced through CSS variables that Tailwind consumes.

## Font Families
- **Sans-serif:** `InterVariable` (variable weight) delivered from `/public/fonts/Inter-roman.var.woff2`.
  - Fallback stack: `Inter`, `Helvetica Neue`, `Helvetica`, `Arial`, `ui-sans-serif`, `system-ui`, `-apple-system`, `Segoe UI`, `sans-serif`.
- **Monospace:** `JetBrainsMonoVariable` (variable weight) delivered from `/public/fonts/JetBrainsMono-Variable.woff2`.
  - Fallback stack: `JetBrains Mono`, `Fira Code`, `Fira Mono`, `SFMono-Regular`, `Menlo`, `Monaco`, `Consolas`, `Liberation Mono`, `Courier New`, `monospace`.

These stacks are exposed as CSS custom properties (`--font-sans` and `--font-mono`) so both Tailwind utilities and vanilla CSS can reference them.

## Loading Strategy
- Fonts are self-hosted under `public/fonts/` and preloaded in `app/layout.tsx` with `<link rel="preload" as="font">` tags to prioritize fetching.
- Each `@font-face` declaration specifies `font-display: swap` to avoid invisible text during load while still benefiting from the custom typefaces once available.
- Tailwind's `fontFamily` extension binds `font-sans` and `font-mono` utilities to the CSS variables, providing ergonomic access throughout the component layer.

## Usage Guidelines
- Prefer the `font-sans` utility for body copy and UI text; it resolves to the Inter variable font with the fallback stack listed above.
- Use the `font-mono` utility for code snippets, numeric data, or technical UI where monospaced alignment is needed.
- When authoring custom CSS, reference the variables directly (`font-family: var(--font-sans);`) to stay aligned with the shared tokens.

## Maintenance
- Source updates: download new `.woff2` variable font files and replace the assets under `public/fonts/` when Inter or JetBrains Mono releases new versions.
- After replacing assets, confirm that preload links and `@font-face` declarations still reference the correct filenames and weight ranges.
- Keep documentation in this file updated when introducing additional weights, italics, or alternative font stacks.
