# Attachment Storage & Retention

## Overview
The `attachments` table acts as a registry for binary artifacts stored in object storage (e.g. AWS S3 or Supabase Storage). Each record tracks the owning entity, where the file lives, and the retention lifecycle metadata so that packages, visitor logs, incidents, and shift reports can share a consistent storage model.

| Column | Purpose |
| --- | --- |
| `entity_type` & `entity_id` | Identify the owning record (`package_log`, `package_signature`, `visitor_log`, `incident_report`, `key_transaction`, or `shift_log`). |
| `s3_bucket` & `s3_key` | Point to the exact object key for retrieval/deletion. |
| `expires_at` | Optional application-level expiration (for temporary files such as visitor IDs). |
| `retention_expires_at` | Hard-retention deadline after which files must be purged to satisfy compliance. |
| `uploaded_by` | Associates uploads with a `profiles.id` for auditing. |

## Storage Guidelines
- Store files in a private bucket. Grant read access via signed URLs or server-side streaming only after verifying the requesting user has read access to the parent record.
- Use hierarchical object keys (`{entity_type}/{entity_id}/{timestamp}-{filename}`) to keep namespaces tidy and simplify lifecycle automation.
- Attachments should be created after the parent record exists to guarantee referential integrity. When cascading deletes are required, remove the object from storage first and then delete the `attachments` row.

## Retention & Cleanup
1. **Short-term files** – Set `expires_at` for artifacts that should disappear automatically (e.g. temporary visitor IDs). Scheduled jobs can target rows where `expires_at < now()` and purge the related object.
2. **Compliance retention** – Populate `retention_expires_at` for records subject to minimum retention periods (e.g. incident photos kept 7 years). Do not allow deletion until that timestamp has passed.
3. **Audit trail** – Preserve `uploaded_by` and timestamps for reporting. Use `attachments` together with `package_logs`, `incident_reports`, `shift_logs`, and other operational tables to reconstruct the full chain of custody.
4. **Lifecycle automation** – Batch jobs should:
   - Select attachments that are past their retention deadlines.
   - Remove the backing object from storage.
   - Delete the `attachments` row within the same transaction to prevent orphaned metadata.

Following these rules keeps storage costs predictable, enforces compliance, and ensures operational teams always have a clear audit trail for every file stored in S3.
