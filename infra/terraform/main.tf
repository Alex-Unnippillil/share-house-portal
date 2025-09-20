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
  region = var.management_region
}

module "aws_org" {
  source = "./aws-org"

  management_region                 = var.management_region
  identity_center_region            = var.identity_center_region
  environment_prefix                = var.environment_prefix
  organization_feature_set          = var.organization_feature_set
  account_access_role               = var.account_access_role
  dev_account_email                 = var.dev_account_email
  staging_account_email             = var.staging_account_email
  prod_account_email                = var.prod_account_email
  logging_account_email             = var.logging_account_email
  enable_identity_center            = var.enable_identity_center
  identity_center_admin_group_id    = var.identity_center_admin_group_id
  identity_center_admin_session_duration = var.identity_center_admin_session_duration
  identity_center_admin_relay_state = var.identity_center_admin_relay_state
  enable_config_aggregator          = var.enable_config_aggregator
  config_aggregator_name            = var.config_aggregator_name
  config_aggregator_role_arn        = var.config_aggregator_role_arn
  cost_allocation_tags              = var.cost_allocation_tags
}
