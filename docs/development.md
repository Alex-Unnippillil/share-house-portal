# Development Environment

This project is structured as a web-first monorepo with dedicated mobile packages under `mobile/`. The setup below keeps the existing Next.js application intact while adding reusable building blocks for React Native apps.

## Prerequisites

- **Node.js 18+** – aligns with the Active LTS release supported by Next.js 14.
- **pnpm 8+** – the repository uses a `pnpm-workspace.yaml` to link the mobile packages. Install pnpm globally with `npm install -g pnpm` if you do not already have it.
- **Supabase project** – required for the existing web application. Refer to the environment section in `README.md` for the exact variables.

## Installing dependencies

```bash
pnpm install
```

`pnpm` will link every package defined in `pnpm-workspace.yaml`, including the new mobile packages.

## Running the web application

```bash
pnpm dev
```

The development server runs at [http://localhost:3000](http://localhost:3000).

## Working with the mobile packages

The reusable mobile code lives in `mobile/packages/`:

- `@mobile/theme` – theme tokens, provider, and hooks.
- `@mobile/ui` – themed primitives built on top of the theme package.
- `@mobile/navigation` – lightweight navigation store and hooks.
- `@mobile/http` – fetch-based HTTP client with request/response interceptors.
- `@mobile/secure-storage` – encrypted token storage abstraction with pluggable adapters.
- `@mobile/deep-links` – helpers for parsing and routing deep links.
- `@mobile/error-boundary` – React error boundary with a mobile-friendly fallback.

### TypeScript configuration

A root `tsconfig.base.json` maintains shared compiler settings and path aliases. Both the web and mobile workspaces extend this base configuration:

- Web-specific settings remain in `tsconfig.json`.
- Mobile code extends `mobile/tsconfig.json`, which enables the React JSX transform for React Native targets.
- Imports such as `@mobile/theme` resolve to the corresponding source package.

### Linting and type checking

```bash
pnpm lint          # Runs Next.js linting and ESLint across mobile packages
pnpm lint:mobile   # Mobile-only linting shortcut
pnpm typecheck     # Type-checks the web app and the mobile workspace
```

### Testing packages in isolation

Each package ships TypeScript sources and can be built or consumed directly in an Expo/React Native app via pnpm workspaces:

```bash
pnpm --filter @mobile/ui test   # Example: run package-specific scripts when added
```

> Tip: use the exported helper `createMemorySecureStorageAdapter` for unit tests without touching device storage.

## Environment variables

Create `.env.local` in the repository root and add the Supabase credentials outlined in `README.md`. These variables are required for the Next.js application but not for the mobile packages.

## Recommended editor settings

- Enable the TypeScript project service so path aliases (`@mobile/*`) resolve correctly.
- Turn on format-on-save using the repository `prettier` configuration for consistent formatting.
