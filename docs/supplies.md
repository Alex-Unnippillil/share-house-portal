# Supplies catalog management

The supplies catalog keeps a curated list of common household items that property admins maintain for each building. These records provide a single source of truth for how bulk purchases should default across shared units.

## Database model

`supabase/migrations/20250709_add_supply_item_defaults.sql` establishes the schema for the `public.supply_items` table and the supporting `public.supply_default_split` enum. Key columns include:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key generated with `gen_random_uuid()` |
| `name` | `text` | Human-friendly item name. |
| `category` | `text` | Category label (e.g. `cleaning`, `bathroom`). |
| `description` | `text` | Optional context such as brand preferences or storage guidance. |
| `unit` | `text` | The measurement unit shown to roommates (e.g. `roll`, `bottle`). |
| `default_quantity` | `integer` | Number of units expected per restock event (defaults to `1`). |
| `default_split` | `supply_default_split` | Enum with values `equal` or `weighted` controlling how costs are divided. |
| `is_active` | `boolean` | When false the item remains in the catalog but is hidden from roommate ordering flows. |
| `created_at` / `updated_at` | `timestamptz` | Timestamps maintained automatically for auditing. |

The migration backfills missing columns when an existing `supply_items` table is present, coercing any legacy `default_split` data into the new enum.

## TypeScript helpers

`types/supplies.ts` exports strongly typed helpers for working with catalog data:

- `SupplyItem`, `SupplyItemInsert`, `SupplyItemUpdate` map directly to the Supabase row/insert/update shapes.
- `SupplyDefaultSplit` reflects the enum values and powers type-safe selects.
- `SUPPLY_SPLIT_OPTIONS` is a UI-friendly array of label/description pairs for rendering selection controls.
- `SupplyActionState` and `SUPPLY_ACTION_INITIAL_STATE` standardise server action responses for the create/update flows.

Use these helpers when building features that need to read or mutate the catalog so that schema changes remain type-safe across the app.

## Admin workflow UI

`/dashboard/supplies` introduces an authenticated admin surface that stitches the pieces together:

1. **Catalog overview** – The table lists every supply item with its unit, default quantity, split behaviour, and active status. Inline forms allow admins to adjust defaults in place.
2. **Quick creation** – The “Add a catalog item” card captures new entries, validating input and resetting the form on success. `default_split` defaults to `equal` and the toggle controls whether the item is immediately visible to roommates.
3. **Inline editing** – Changing fields and clicking “Save” persists updates through the typed Supabase client, refreshing the data grid after each mutation.
4. **Soft removal** – “Remove” deletes the record outright when an item is no longer needed.

Validation feedback displays per-field and per-row status messages so admins understand when changes succeed or need attention.

## Default split semantics

- **Equal** – every roommate contributes the same share towards the restock cost.
- **Weighted** – contributions honour roommate-specific weightings configured at the unit level (for example, larger rooms cover a higher percentage).

When `default_split` is set to `weighted`, downstream billing flows should query the unit’s stored weights to apportion charges; otherwise, divide the total evenly.
