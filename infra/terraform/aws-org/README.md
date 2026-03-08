# AWS Organization Module

This module creates the foundational AWS Organization for Share House Platform projects. It provisions workload and security organizational units, production lifecycle accounts, IAM Identity Center access, baseline service control policies (SCPs), AWS Config organization aggregation, and activates standard cost allocation tags.

## Features

- Creates or adopts an AWS Organization with service access for AWS Config, IAM Identity Center, and Tag Policies.
- Provisions the following accounts beneath dedicated organizational units:
  - `*-dev`
  - `*-staging`
  - `*-prod`
  - `*-logging` (designated as the delegated administrator for AWS Config)
- Attaches guardrail SCPs to block root-user usage and require MFA.
- Optionally configures IAM Identity Center with an Administrator permission set and assignments for all managed accounts.
- Enables an AWS Config organization aggregator.
- Activates Cost Explorer cost allocation tags for `Environment`, `Owner`, and `CostCenter` by default.

## Usage

```hcl
module "aws_org" {
  source = "./aws-org"

  environment_prefix      = "share-house"
  dev_account_email       = "dev@example.com"
  staging_account_email   = "staging@example.com"
  prod_account_email      = "prod@example.com"
  logging_account_email   = "logging@example.com"
  identity_center_region  = "us-east-1"
  identity_center_admin_group_id = "12345678-90ab-cdef-1234-567890abcdef"
  config_aggregator_role_arn     = "arn:aws:iam::111122223333:role/ConfigAggregatorRole"
}
```

### Optional Configuration

- Disable IAM Identity Center configuration by setting `enable_identity_center = false`.
- Override the default cost allocation tags with a custom list via `cost_allocation_tags`.
- Provide `identity_center_admin_relay_state` when you want to deep-link into a central landing page.
- Set `enable_config_aggregator = false` if an aggregator is managed outside of Terraform.

## Outputs

- `organization_id` – The AWS Organization ID.
- `account_ids` – Map of environment name to AWS account IDs.
- `organizational_units` – Workloads and security OU IDs.
- `scp_policy_ids` – IDs of the guardrail SCPs.
- `identity_center_permission_set_arn` – Administrator permission set ARN when enabled.
- `cost_allocation_tags` – The activated cost allocation tag keys.
