# Logging & Debugging Guidelines

This project treats stray `console.*` calls as production regressions. Unbounded console logging in user-facing flows can leak sensitive data, slow rendering, and bloat bundles. Follow the practices below to keep runtime noise out of critical paths while still enabling useful debugging.

## Production-safe logging

- **Use `console.error` for unexpected failures** that should surface in logs or monitoring. These calls are preserved in production builds.
- **Use `console.warn` for recoverable issues** (e.g., configuration gaps, validation edge cases). Warnings remain in builds so on-call engineers can trace soft-fail scenarios.
- **Do not use `console.log`, `console.info`, or `console.debug` in app code.** They are flagged by lint and stripped from production bundles.
- Prefer returning structured error messages from actions and API routes instead of printing success breadcrumbs.

## Lint enforcement

- ESLint now enforces `no-console` with an allow-list for `error` and `warn` only.
- `pnpm lint` (and CI) will fail on any direct usage of `console.log`, `console.info`, `console.debug`, or other disallowed console methods.
- If you truly need request-scoped diagnostics during development, wrap them in a helper that is gated by `process.env.NODE_ENV !== 'production'` and add a file-level lint exception with justification.

## Build-time removal

- Next.js is configured to strip all console statements except `console.error` and `console.warn` from production bundles via `compiler.removeConsole`.
- This guarantees that even transient development logs do not ship, protecting bundle size and reducing noise in Vercel logs.

## Review checklist

Before opening a PR, double-check the following:

1. No raw `console.log`/`console.info`/`console.debug` calls remain in dashboard actions, account forms, or API routes.
2. Lint passes locally (`pnpm lint`).
3. Added documentation references any new debugging helpers or lint suppressions.

Keeping logs intentional and structured helps us maintain observability without sacrificing performance or privacy.
