# Storage Architecture

The Terraform configuration under `infra/terraform/storage` provisions the Amazon S3
buckets that back the product's storage needs. Each bucket is encrypted with a
bucket-specific AWS KMS key and protected by a tailored bucket policy so that
only the services that need the data are able to access it. Buckets are named
using the pattern `<bucket_prefix>-<environment>-<purpose>` (for example
`share-house-portal-prod-documents`).

## Bucket Overview

| Bucket | Purpose | Access pattern | Retention & lifecycle | Notes |
| --- | --- | --- | --- | --- |
| `documents` | Source of truth for legal agreements, IDs, leases, and other user-provided paperwork. | Application APIs and internal review tooling require read/write access. Principals should be supplied via `documents_bucket_allowed_principals`. | Current versions are kept in the standard tier. Objects transition to STANDARD_IA after 90 days, move to Glacier as non-current after 180 days, and non-current versions are trimmed after three years. Multipart uploads are auto-aborted after 7 days. | Encrypted with a dedicated KMS key and enforced TLS-only access via bucket policy. |
| `images` | Stores listing images, floorplans, and marketing assets used by the front-end. | The public web application writes and reads through a media-processing pipeline role passed in `images_bucket_allowed_principals`. | Only the latest image revisions are needed. Non-current versions are purged after 90 days and stalled multipart uploads are aborted after 7 days. | TLS-only access; encryption handled by a dedicated KMS key. |
| `exports` | Temporary analytics exports and partner data drops. | Analytics export jobs write files while partner ingestion roles (specified in `exports_bucket_allowed_principals`) fetch and delete them. | Files automatically expire after 30 days and incomplete uploads are aborted after 3 days. | Designed for short-lived data. |
| `artifacts` | CI/CD build outputs, deployment bundles, and other engineering artifacts. | CI and deployment roles listed in `artifacts_bucket_allowed_principals` require read/write access. | Artifacts automatically expire after 180 days and incomplete uploads are aborted after 7 days to cap storage costs. | Tight TLS enforcement; not intended for public distribution. |
| `backups` | Long-term, immutable backups of databases and configuration. | Only automated backup and recovery tooling principals provided through `backups_bucket_allowed_principals` can read or write. Deletes are intentionally not granted. | Backups transition to Glacier after 30 days, are retained for 10 years, and multipart uploads are aborted after 7 days. Object Lock enforces a 365-day compliance retention period. | Versioning and object lock combine to deliver WORM guarantees for compliance. |

## Access Control & Encryption

- **KMS keys** – Every bucket has a dedicated KMS key with automatic rotation.
  IAM principals defined in the `*_bucket_allowed_principals` variables are
  granted Encrypt/Decrypt permissions so they can read and write objects with
  SSE-KMS.
- **Bucket policies** – Transport security is enforced by denying non-TLS
  requests. Additional statements allow the consuming services to perform
  bucket-level operations (for example, `s3:ListBucket`) and object-level
  operations (for example, `s3:GetObject`).
- **Public access** – Each bucket has public access blocks enabled to prevent
  accidental exposure.

## Retention Expectations

| Data class | Minimum retention | Deletion policy |
| --- | --- | --- |
| Legal & compliance documents | 3 years of version history with archival of cold versions to Glacier | Manual purge only after retention satisfied. |
| Marketing imagery | Latest version kept online; stale versions removed after 90 days | Automatic lifecycle purge. |
| Analytics exports | 30 days | Automatically expired. |
| Build artifacts | 180 days | Automatically expired. |
| Backups | 10 years | Automatic expiry after retention; WORM lock prevents tampering for first year. |

To grant a new service access, add the service's IAM role ARN to the relevant
`*_bucket_allowed_principals` variable when instantiating the storage module.
