# Supabase Storage Hardening

This document captures how Share House Portal provisions and protects Supabase
Storage buckets for household scoped content such as floorplans, payment
receipts, and lease paperwork.

## Bucket Provisioning

Buckets are provisioned via the Supabase CLI to guarantee consistent defaults
and prevent accidental public access. Run the script below in each environment
after authenticating with `supabase login`:

```bash
./supabase/scripts/create-storage-buckets.sh
```

The script issues the following commands to create locked-down buckets:

```bash
supabase storage create-bucket floorplans --public=false \
  --file-size-limit=5242880 \
  --allowed-mime-types="image/svg+xml,image/png,application/pdf"

supabase storage create-bucket receipts --public=false \
  --file-size-limit=10485760 \
  --allowed-mime-types="application/pdf,image/png,image/jpeg"

supabase storage create-bucket docs --public=false \
  --file-size-limit=10485760 \
  --allowed-mime-types="application/pdf,image/png,image/jpeg,text/plain"
```

All buckets are private by default and scoped to household membership through
row-level security (RLS) policies defined in the migration
`supabase/migrations/202505061200_storage_policies.sql`.

## Metadata Requirements

Uploads must include two metadata keys:

| Key | Description |
| --- | --- |
| `member_id` | The authenticated user's UUID returned by `auth.uid()` at upload time. |
| `household_id` | The UUID of the household the uploader belongs to. Stored on `public.profiles.household_id`. |

The upload helper `utils/supabase/storage.ts` enforces these requirements and
throws an error when either identifier is missing. Example usage:

```ts
const { data, error } = await uploadToManagedBucket({
  bucket: "receipts",
  client: supabase,
  file: fileBlob,
  path: `receipts/${invoiceId}.pdf`,
  memberId: session.user.id,
  householdId,
  contentType: "application/pdf",
});
```

The helper merges any additional metadata passed into the call while
prioritising the required identifiers, ensuring policies evaluate consistently.

## Storage Policies

The migration enforces the following access controls across the managed
buckets:

- **Read** – Any authenticated user can fetch objects when their profile's
  `household_id` matches the object's `metadata.household_id`.
- **Insert** – Allowed only when the uploader tags the object with their own
  `member_id` and the household they belong to.
- **Update** – Restricted to the original uploader (`owner = auth.uid()`) while
  retaining the same metadata requirements.
- **Delete** – Granted solely to profiles whose `role` is `admin`, regardless of
  who uploaded the file.

These policies apply uniformly to the `floorplans`, `receipts`, and `docs`
buckets by referencing the `storage.managed_buckets` view created in the same
migration. Any new bucket that should follow the same rules can be appended to
that view to inherit the policies automatically.

## Operational Notes

- Ensure onboarding flows populate `public.profiles.household_id`; uploads will
  be rejected when the value is missing.
- Admin tooling should surface metadata in audit logs so deletions can be traced
  to the acting administrator.
- Scheduled jobs that upload documents with the service role must continue to
  set the `member_id` and `household_id` metadata to align with policy
  constraints, even when run server-side.
