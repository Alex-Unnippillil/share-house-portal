# Terraform Infrastructure

This directory holds Terraform configuration used to bootstrap the Share House Platform AWS Organization.

## Bootstrap Instructions

1. **Install prerequisites**
   - Terraform CLI v1.5.0 or later.
   - AWS CLI configured with credentials for the management (payer) account that has `organizations:*`, `sso:*`, `config:*`, and `ce:*` permissions.
2. **Create a backend**
   - Configure the remote state backend (e.g., S3 + DynamoDB) that will store Terraform state for the management account. Update your `terraform` block as needed before running the module.
3. **Populate secret variables**
   - Provide unique email addresses for each child account. These must not already be associated with an AWS account.
   - Export sensitive values with a `terraform.tfvars` file or environment variables. Example `terraform.tfvars`:
     ```hcl
     dev_account_email     = "dev@example.com"
     staging_account_email = "staging@example.com"
     prod_account_email    = "prod@example.com"
     logging_account_email = "logging@example.com"
     identity_center_admin_group_id = "12345678-90ab-cdef-1234-567890abcdef"
     config_aggregator_role_arn     = "arn:aws:iam::111122223333:role/ConfigAggregatorRole"
     ```
4. **Initialize Terraform**
   ```bash
   terraform -chdir=infra/terraform init
   ```
5. **Review and apply**
   ```bash
   terraform -chdir=infra/terraform plan
   terraform -chdir=infra/terraform apply
   ```
   The `apply` step provisions the AWS Organization accounts, IAM Identity Center configuration, SCPs, AWS Config aggregator, and activates cost allocation tags.
6. **Post-apply validation**
   - Confirm the new accounts appear in the AWS Organizations console.
   - Verify IAM Identity Center assignments for the administrator group.
   - Ensure the AWS Config aggregator reports healthy status.
   - Check Cost Explorer to ensure the cost allocation tags are active within 24 hours.

## Module Layout

- [`aws-org/`](./aws-org) – Terraform module that deploys the core AWS Organization scaffold.
