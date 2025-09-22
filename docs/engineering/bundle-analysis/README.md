# Bundle analysis reports

These static reports were captured after migrating shared components to the SVG sprite sheet.

- **Command**: `CI=1 ANALYZE=true npm run build`
- **Reports**:
  - `client.html`
  - `edge.html`
  - `nodejs.html`

Open the HTML files locally to inspect module sizes and confirm that sprite-driven icons keep the shared UI bundles free from repeated `lucide-react` imports.
