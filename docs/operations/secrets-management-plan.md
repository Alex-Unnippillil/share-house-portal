# Secrets Management Plan

This plan tracks the sensitive configuration required to operate the Share House Portal data platform. Secrets are stored in AWS Secrets Manager with replication across production regions. Each secret entry includes ownership information, rotation requirements, and operational metadata such as maintenance windows and connection coordinates.

## Storage and Access Controls

- **Vault**: AWS Secrets Manager (production account).
- **Replication**: Single-region with automated backup to cross-region recovery vault.
- **Access**: IAM roles scoped to the application, data platform engineers, and on-call SREs.
- **Rotation**: Managed by AWS for credentials that support automatic rotation; manual runbooks exist for all others.

## Secret Inventory

| Secret Name | Purpose | Contents | Rotation | Owner |
|-------------|---------|----------|----------|-------|
| `share-house/rds/sqlserver/admin` | Stores the managed master user secret for the Multi-AZ SQL Server instance. | - `master_secret_arn` (from Terraform output)<br>- `endpoint`<br>- `port`<br>- `maintenance_window`<br>- `backup_window` | Automatic (Secrets Manager rotation enabled via `manage_master_user_password`) | Data Platform Team |
| `share-house/rds/sqlserver/app` | Application credentials for least-privilege connections. | - `username`<br>- `password`<br>- `endpoint`<br>- `port`<br>- `maintenance_window` | Manual rotation every 90 days with runbook `RUNBOOK-DB-04` | Application Team |

## Operational Notes

- The Terraform module exposes the writer endpoint and port through outputs so they can be injected into the secrets at deploy time.
- Preferred backup window: `02:00-04:00` UTC. Preferred maintenance window: `sun:05:00-sun:07:00` UTC. These values must be mirrored in the secrets to inform scheduling and change freeze decisions.
- When Performance Insights data is queried, reference the `db_instance_resource_id` output; the identifier is not considered a secret but is documented in deployment runbooks.
- Any change to maintenance or backup windows requires updating the associated secret entries and notifying the on-call rotation.
