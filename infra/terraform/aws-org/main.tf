terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.30"
    }
  }
}

provider "aws" {
  alias  = "management"
  region = var.management_region
}

provider "aws" {
  alias  = "identity_center"
  region = var.identity_center_region
}

data "aws_partition" "current" {
  provider = aws.management
}

locals {
  scp_policies = {
    deny_root_access = jsonencode({
      "Version" : "2012-10-17",
      "Statement" : [
        {
          "Sid" : "DenyRootUserUsage",
          "Effect" : "Deny",
          "Action" : "*",
          "Resource" : "*",
          "Condition" : {
            "StringLike" : {
              "aws:PrincipalArn" : [
                "arn:${data.aws_partition.current.partition}:iam::*:root"
              ]
            }
          }
        }
      ]
    })
    enforce_mfa = jsonencode({
      "Version" : "2012-10-17",
      "Statement" : [
        {
          "Sid" : "DenyWithoutMFA",
          "Effect" : "Deny",
          "Action" : "*",
          "Resource" : "*",
          "Condition" : {
            "BoolIfExists" : {
              "aws:MultiFactorAuthPresent" : "false"
            }
          }
        }
      ]
    })
  }
}

resource "aws_organizations_organization" "this" {
  aws_service_access_principals = [
    "config.amazonaws.com",
    "sso.amazonaws.com",
    "tagpolicies.tag.amazonaws.com"
  ]

  enabled_policy_types = [
    "SERVICE_CONTROL_POLICY",
    "TAG_POLICY"
  ]

  feature_set = var.organization_feature_set
}

resource "aws_organizations_organizational_unit" "workloads" {
  name      = "workloads"
  parent_id = aws_organizations_organization.this.roots[0].id
}

resource "aws_organizations_organizational_unit" "security" {
  name      = "security"
  parent_id = aws_organizations_organization.this.roots[0].id
}

locals {
  account_definitions = {
    dev = {
      name  = "${var.environment_prefix}-dev"
      email = var.dev_account_email
      ou    = aws_organizations_organizational_unit.workloads.id
    }
    staging = {
      name  = "${var.environment_prefix}-staging"
      email = var.staging_account_email
      ou    = aws_organizations_organizational_unit.workloads.id
    }
    prod = {
      name  = "${var.environment_prefix}-prod"
      email = var.prod_account_email
      ou    = aws_organizations_organizational_unit.workloads.id
    }
    logging = {
      name  = "${var.environment_prefix}-logging"
      email = var.logging_account_email
      ou    = aws_organizations_organizational_unit.security.id
    }
  }
}

resource "aws_organizations_account" "managed" {
  for_each = local.account_definitions

  email     = each.value.email
  name      = each.value.name
  parent_id = each.value.ou
  role_name = var.account_access_role

  lifecycle {
    ignore_changes = [
      iam_user_access_to_billing,
      role_name
    ]
  }
}

resource "aws_organizations_delegated_administrator" "config" {
  account_id        = aws_organizations_account.managed["logging"].id
  service_principal = "config.amazonaws.com"
}

resource "aws_organizations_policy" "scp" {
  for_each = local.scp_policies

  name    = each.key
  content = each.value
  type    = "SERVICE_CONTROL_POLICY"
}

resource "aws_organizations_policy_attachment" "workloads" {
  for_each = aws_organizations_policy.scp

  policy_id = each.value.id
  target_id = aws_organizations_organizational_unit.workloads.id
}

resource "aws_organizations_policy_attachment" "security" {
  for_each = aws_organizations_policy.scp

  policy_id = each.value.id
  target_id = aws_organizations_organizational_unit.security.id
}

data "aws_ssoadmin_instances" "this" {
  provider = aws.identity_center

  count = var.enable_identity_center ? 1 : 0
}

locals {
  identity_center_instance_arn = var.enable_identity_center ? try(data.aws_ssoadmin_instances.this[0].arns[0], null) : null
}

resource "aws_ssoadmin_permission_set" "administrator" {
  provider = aws.identity_center

  count = var.enable_identity_center ? 1 : 0

  name             = "AdministratorAccess"
  description      = "Grants administrator access to AWS accounts."
  instance_arn     = local.identity_center_instance_arn
  session_duration = var.identity_center_admin_session_duration
  relay_state      = var.identity_center_admin_relay_state

  managed_policies = [
    "arn:${data.aws_partition.current.partition}:iam::aws:policy/AdministratorAccess"
  ]

  lifecycle {
    precondition {
      condition     = local.identity_center_instance_arn != null && local.identity_center_instance_arn != ""
      error_message = "enable_identity_center requires an active IAM Identity Center instance in the target region."
    }
  }
}

resource "aws_ssoadmin_account_assignment" "administrator" {
  provider = aws.identity_center

  for_each = var.enable_identity_center && var.identity_center_admin_group_id != "" ? aws_organizations_account.managed : {}

  instance_arn       = local.identity_center_instance_arn
  permission_set_arn = aws_ssoadmin_permission_set.administrator[0].arn
  principal_id       = var.identity_center_admin_group_id
  principal_type     = "GROUP"
  target_id          = each.value.id
  target_type        = "AWS_ACCOUNT"
}

resource "aws_config_configuration_aggregator" "organization" {
  provider = aws.management

  count = var.enable_config_aggregator ? 1 : 0

  name = var.config_aggregator_name

  organization_aggregation_source {
    all_regions = true
    role_arn    = var.config_aggregator_role_arn
  }

  lifecycle {
    precondition {
      condition     = var.config_aggregator_role_arn != null && var.config_aggregator_role_arn != ""
      error_message = "config_aggregator_role_arn must be provided when enable_config_aggregator is true."
    }
  }
}

resource "aws_ce_cost_allocation_tag" "this" {
  for_each = toset(var.cost_allocation_tags)

  tag_key = each.value
  status  = "Active"
}

output "organization_id" {
  value = aws_organizations_organization.this.id
}

output "account_ids" {
  value = { for name, account in aws_organizations_account.managed : name => account.id }
}

output "organizational_units" {
  value = {
    workloads = aws_organizations_organizational_unit.workloads.id
    security  = aws_organizations_organizational_unit.security.id
  }
}

output "scp_policy_ids" {
  value = { for name, policy in aws_organizations_policy.scp : name => policy.id }
}

output "identity_center_permission_set_arn" {
  value       = var.enable_identity_center ? aws_ssoadmin_permission_set.administrator[0].arn : null
  description = "Administrator permission set ARN when IAM Identity Center is enabled."
}

output "cost_allocation_tags" {
  value       = keys(aws_ce_cost_allocation_tag.this)
  description = "Activated cost allocation tags."
}
