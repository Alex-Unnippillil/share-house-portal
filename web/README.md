# Share House Portal web client

A Vue 3 + Vite front-end scaffold tailored for the Share House ecosystem. It ships with routing, state management, localization, a composable design system, dark mode, and an accessibility baseline so new product slices can come online quickly.

## Getting started

```bash
cd web
pnpm install
pnpm dev
```

### Available scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the Vite development server with hot module replacement. |
| `pnpm build` | Type-check and build the production bundle. |
| `pnpm preview` | Preview the production build locally. |
| `pnpm lint` | Run ESLint with the repository-wide Prettier rules and Vue recommendations. |
| `pnpm type-check` | Run `vue-tsc` for strict type safety across `.ts` and `.vue` files. |
| `pnpm format` | Apply the shared Prettier formatting (including import sorting). |

## Architectural overview

```
src/
├─ app/               # Top-level shell layout and global chrome
├─ components/        # Feature-specific UI (navigation, accessibility utilities)
├─ composables/       # Reusable Composition API hooks (e.g., color mode)
├─ design-system/     # Base UI primitives and the registration plugin
├─ locales/           # i18n message catalogs and factory for Vue I18n
├─ router/            # Route definitions plus guards for auth + focus management
├─ services/          # HTTP clients and external integrations (Axios instance)
├─ stores/            # Pinia stores for auth, preferences, and setup helpers
├─ styles/            # Global styles and design tokens (light/dark themes)
└─ views/             # Page-level routed views
```

### State management

- **Pinia** powers both the authentication and user preference stores. Stores expose `hydrate()` helpers so persisted sessions and theme selections are restored on startup.
- `src/stores/index.ts` exports a shared Pinia instance so services (like Axios interceptors) can read state outside of components.
- The preferences store synchronizes locale, color scheme, and document language attributes while respecting system dark-mode changes.

### Networking

- `src/services/apiClient.ts` exports a configured Axios instance.
  - Request interceptor attaches the bearer token from the auth store when present.
  - Response interceptor clears the session on `401` responses, allowing router guards to redirect.
  - The default base URL is driven by `VITE_API_URL`, with a sensible placeholder fallback.

### Routing & accessibility

- Vue Router provides three primary routes (`/`, `/about`, `/settings`) plus a catch-all 404 view.
- `setupRouterGuards` hydrates auth state, enforces `requiresAuth` metadata, updates the localized document title, and focuses the `main` region on navigation for better keyboard/screen-reader usability.
- A visually hidden skip link, reduced-motion defaults, and focus-visible styling ship as part of the baseline experience.

### Design system & theming

- `src/styles/tokens.css` defines light/dark tokens for colors, radii, and elevation. The preference store toggles the `data-theme` attribute on `<html>` to switch themes.
- `installDesignSystem` globally registers base primitives (`BaseButton`, `BaseCard`, `BaseLink`) used throughout the application.
- Navigation components (language and theme selectors) compose these primitives, ensuring consistent styling while remaining accessible.

### Localization

- Vue I18n is initialized through `createI18nInstance` with English and Spanish catalogs.
- Locale changes propagate from the preferences store to Vue I18n and the document's `lang` attribute so screen readers announce content correctly.

## Future enhancements

- Replace placeholder CTA handlers and static data with live Supabase-backed dashboards.
- Expand the design system with form controls, data visualization primitives, and motion tokens.
- Integrate real authentication flows once the backend APIs are available.
