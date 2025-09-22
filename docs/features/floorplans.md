# Floorplan Tile Viewer

The floorplan viewer renders large property layouts using lazily loaded 256 × 256 pixel tiles. It supports smooth panning, inertial drag, and pinch/wheel zoom so roommates can inspect shared spaces without downloading enormous floorplan files.

## Viewer behaviour

- Tiles are fetched on demand for the current viewport. Only tiles intersecting the visible canvas are requested, keeping bandwidth and memory predictable.
- Pinch gestures on touch devices and mouse wheel zooming on desktop re-centre the viewport around the interaction point. Stage position and scale are clamped to the published zoom levels.
- Switching plans purges the in-memory cache to avoid runaway allocations when flipping through multiple floors.
- The viewer surfaces helpful fallbacks when Supabase public URLs are not configured, allowing QA in local environments without storage access.

## Tile generation workflow

Run the TypeScript script to slice a high-resolution plan into tiles and upload both imagery and metadata to Supabase storage:

```bash
pnpm tsx scripts/generate-floorplan-tiles.ts \
  --source ./assets/floorplans/unit-a.png \
  --plan-id unit-a \
  --name "Unit A" \
  --bucket floorplans
```

Key behaviours:

- Tiles are written to `tiles/<plan-id>/<zoom>/<x>/<y>.png` inside the bucket. Metadata JSON is stored under `metadata/<plan-id>.json` for discovery.
- The script accepts `--dry-run` and `--output` flags to inspect generated assets locally before uploading.
- Supabase credentials are sourced from `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`. Buckets must be readable from the client (public or via CDN).

## Memory usage targets

- Keep concurrent tile cache usage under **80 MB** on desktop by limiting loaded tiles to the visible viewport and clearing caches on plan changes.
- Mobile sessions should remain under **40 MB** by aggressively culling tiles when the viewport moves and avoiding multi-plan caching.
- Tile generation runs sequentially to cap Node.js heap spikes below **512 MB** even for very large source images.

## Testing

- `pnpm lint` – ✅ Next.js ESLint suite (tailwind shorthand warnings resolved).
- `pnpm test` – ✅ Vitest component suite.
