# Secrets Management

This document describes how the Share House Portal provisions and maintains
sensitive configuration values in AWS Secrets Manager and Systems Manager
Parameter Store using Terraform.

## Module overview

All secret primitives are managed by the Terraform module at
`infra/terraform/security/secrets.tf`. The module exposes three inputs:

- `secrets_manager_secrets` – map of AWS Secrets Manager secrets to create and
  rotate.
- `ssm_parameters` – map of Parameter Store entries that back application
  configuration.
- `service_access` – map of IAM roles that receive least-privilege read
  permissions to the required secrets.

The module also exposes outputs for each ARN to simplify downstream IAM and
application wiring.

## Naming conventions

To keep the secret inventory predictable and environment aware we follow the
pattern:

```
/<environment>/<workload>/<purpose>
```

Examples:

- `/prod/api/database-url`
- `/staging/worker/sendgrid-key`
- `/shared/monitoring/pagerduty-routing`

When defining new secrets:

1. Prefer short workload identifiers such as `api`, `worker`, or `jobs`.
2. Use a hyphenated `purpose` segment that matches the consuming code (for
   example `database-url`, `jwt-signing-key`).
3. Align Secrets Manager secret names and Parameter Store paths when both exist
   for the same concern.

## Rotation workflows

### Secrets Manager

Secrets Manager entries can be rotated automatically by providing a Lambda ARN
and `rotation_days` interval inside `secrets_manager_secrets`. The module creates
an `aws_secretsmanager_secret_rotation` resource, which calls the supplied Lambda
function on the configured cadence. The Lambda is responsible for generating the
new credential, updating dependent systems, and setting the new secret value
using the event payload supplied by AWS.

Rotation best practices:

- Always deploy the rotation Lambda with idempotent logic. It may be retried by
  AWS if failures occur.
- Grant the Lambda IAM role permissions to update both the secret and the target
  system (for example, RDS, Redis, or third-party API).
- Validate Lambda execution with integration tests before assigning it to a
  production secret.

### Parameter Store

Parameter Store entries accept rotation schedules via EventBridge Scheduler.
When `rotation_lambda_arn` and `rotation_schedule_expression` are set for a
parameter, the module creates an `aws_scheduler_schedule` resource that invokes
the Lambda on the requested cadence with the parameter name in the JSON payload.
The Lambda should fetch the current value, produce a replacement, and update the
parameter via the AWS SDK.

For workloads that require flexible execution windows, provide
`rotation_flexible_time_window` with `mode` (`FLEXIBLE` or `OFF`) and optional
`maximum_window`/`minimum_window` durations in minutes. Use this to avoid
coordinated maintenance windows for downstream dependencies.

Rotation best practices:

- Implement concurrency controls in the Lambda to avoid overlapping runs if the
  rotation window is shorter than the execution time.
- Emit structured logs describing the rotation status and new version metadata
  for auditability.
- Ensure Parameter Store values are encrypted (`SecureString`) unless the value
  is non-sensitive.

## Least-privilege access

The `service_access` input provisions IAM roles with the minimal read-only
permissions required by each application component. For example:

```hcl
service_access = {
  api = {
    principal_service            = "ecs-tasks.amazonaws.com"
    secrets_manager_secret_names = ["/prod/api/database-url"]
    parameter_names              = ["/prod/api/jwt-secret"]
  }
}
```

The resulting role can be assumed by the ECS tasks running the API. Only the
listed secrets are included in the IAM policy document, preventing accidental
leakage of unrelated credentials.

## Operational workflow

1. Define or update secrets within `secrets_manager_secrets` and
   `ssm_parameters`, including rotation metadata and tagging.
2. Create or adjust IAM role entries in `service_access` to map workloads to the
   secrets they require.
3. Run `terraform plan` and `terraform apply` from the environment-specific root
   module to roll out the changes.
4. Monitor the rotation Lambdas and EventBridge Scheduler metrics to ensure
   execution succeeds, especially after credential updates or infrastructure
   changes.

Following this approach keeps the secret inventory auditable, enforceable through
code review, and continuously rotated to minimize credential exposure risk.
