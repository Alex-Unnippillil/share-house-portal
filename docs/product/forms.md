# Long-form Autosave Strategy

## Overview
Longer forms such as maintenance requests and visitor bookings now persist in-progress drafts automatically. The `useAutosaveDraft` hook throttles change detection and saves form state every ~2 seconds while the user is actively editing. Drafts are written to Supabase when an authenticated user is available and fall back to IndexedDB on the device when Supabase cannot be reached.

## Hook contract
- **Hook**: `useAutosaveDraft(formKey, data, options)`
  - `formKey`: stable identifier per form.
  - `data`: the watched form values (typically `form.watch()`).
  - `options`:
    - `storage`: prefer `"supabase"` (default) or `"indexeddb"`.
    - `throttleMs`: debounce window before persisting (defaults to 1.5s, forms use 2s).
    - `isDirty`: optional flag (e.g. `form.formState.isDirty`) to suppress saving pristine defaults.
    - `serialize` / `deserialize`: optional transforms for non-JSON-friendly values (dates, Maps, etc.).
    - `expireMs`: retention window before a draft is considered stale (defaults to 30 days).
- **Returns** status metadata (`status`, `lastSavedAt`, `lastError`), booleans (`hasDraft`, `isLoadingDraft`), resolved storage target, and control helpers (`resumeDraft`, `clearDraft`).
- Autosave pauses while the initial draft is loading to avoid overwriting prior progress and resumes once the user changes any field.

## Storage flows
- **Supabase**
  - Drafts land in `public.form_drafts` keyed by `(user_id, form_key)` with an `expires_at` column.
  - Upserts ensure a single draft per user/form combination. `expires_at` is refreshed on every save.
  - RLS policy restricts access to the owning user only.
- **IndexedDB**
  - Local fallback (DB: `share-house-portal`, store: `form_drafts`).
  - Records mirror Supabase payload shape and carry the same `updatedAt` / `expiresAt` metadata for consistent cleanup semantics.
  - Reads/writes are guarded to run only in the browser, protecting SSR paths.

## UI affordances
- Maintenance and visitor booking forms display a banner when a draft exists with **Resume** and **Discard** controls.
- A status pill summarises autosave progress (`Saving…`, `Draft saved 2 minutes ago`, or error messaging) alongside the active storage target (“Synced to Supabase” vs “Stored on this device”).
- On successful submission the draft is cleared to prevent stale data from resurfacing.

## Draft lifecycle & cleanup
- Drafts default to a 30 day TTL. Components may override via `expireMs` if a shorter retention window is desired.
- A nightly cron job (`cleanup_form_drafts`, 03:00 UTC) removes rows where `expires_at` has passed or the draft has been idle for 30+ days, keeping storage tidy.
- Local drafts honour `expiresAt` during load; expired entries are purged the next time a form mounts.

## Adoption checklist for new forms
1. Choose a unique `formKey` and wire `useAutosaveDraft(formKey, form.watch(), { isDirty: form.formState.isDirty })`.
2. Provide serializers when form data includes non-JSON primitives (e.g. convert `Date` values to ISO strings).
3. Surface the standard status banner and storage indicator to give tenants visibility and control over their drafts.
4. Clear the draft via `clearDraft()` after successful submission.
