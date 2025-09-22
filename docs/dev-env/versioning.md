# Runtime and Framework Versioning

This project pins the core toolchain to guarantee consistent builds locally and in CI.

## Current versions

| Tool | Version | Source of truth |
| --- | --- | --- |
| Node.js | 20.14.0 | `.nvmrc`, `.node-version`, and `package.json` `engines.node` |
| pnpm | 9.5.0 | `package.json` `packageManager`/`engines.pnpm` and the CI workflow |
| Next.js | 14.2.4 | `package.json` `dependencies.next` and `pnpm.overrides.next` |
| TypeScript | 5.5.4 | `package.json` `devDependencies.typescript` and `pnpm.overrides.typescript` |

## Updating Node.js

1. Bump the version in `.nvmrc` **and** `.node-version`.
2. Update `package.json` `engines.node` to the same value.
3. Confirm the GitHub Action at `.github/workflows/ci.yml` continues to rely on `.nvmrc`.
4. Re-run `corepack prepare pnpm@<version> --activate` locally to ensure pnpm is compatible.
5. Run the validation commands below before committing.

## Updating pnpm

1. Update the `packageManager` and `engines.pnpm` fields in `package.json`.
2. Adjust the `corepack prepare` command in `.github/workflows/ci.yml` to the new pnpm release.
3. Re-run `corepack prepare pnpm@<version> --activate` locally so your shell uses the new version.
4. Install dependencies with `pnpm install --frozen-lockfile` to refresh the local store.

## Updating Next.js or TypeScript

1. Change the version in `package.json` (`dependencies.next` or `devDependencies.typescript`).
2. Mirror the same version in `package.json` `pnpm.overrides` so the lockfile cannot drift.
3. Update the expectations in `scripts/verify-framework-versions.mjs`.
4. If the new version requires Renovate automation, edit `renovate.json` accordingly.
5. Regenerate the lockfiles (`pnpm-lock.yaml` and `package-lock.json`) so their specifiers match.

## Validation checklist

After any toolchain upgrade run:

```bash
pnpm install --frozen-lockfile
pnpm run verify:framework
pnpm run lint
pnpm run test
```

All steps must pass locally before opening a pull request.
