variable "management_region" {
  description = "AWS region to target for the management account provider."
  type        = string
  default     = "us-east-1"
}

variable "identity_center_region" {
  description = "Region where IAM Identity Center is hosted."
  type        = string
  default     = "us-east-1"
}

variable "environment_prefix" {
  description = "Prefix used when naming provisioned AWS accounts."
  type        = string
  default     = "share-house"
}

variable "organization_feature_set" {
  description = "Feature set for the AWS Organization (must be ALL for SCPs)."
  type        = string
  default     = "ALL"
}

variable "account_access_role" {
  description = "The IAM role to create in new accounts for cross-account access."
  type        = string
  default     = "OrganizationAccountAccessRole"
}

variable "dev_account_email" {
  description = "Email address for the development account root user."
  type        = string
}

variable "staging_account_email" {
  description = "Email address for the staging account root user."
  type        = string
}

variable "prod_account_email" {
  description = "Email address for the production account root user."
  type        = string
}

variable "logging_account_email" {
  description = "Email address for the logging/security tooling account root user."
  type        = string
}

variable "enable_identity_center" {
  description = "Whether to configure IAM Identity Center assignments."
  type        = bool
  default     = true
}

variable "identity_center_admin_group_id" {
  description = "IAM Identity Center group ID that will receive administrator access."
  type        = string
  default     = ""
}

variable "identity_center_admin_session_duration" {
  description = "Session duration for the administrator permission set."
  type        = string
  default     = "PT8H"
}

variable "identity_center_admin_relay_state" {
  description = "Optional relay state URL for the administrator permission set."
  type        = string
  default     = null
}

variable "enable_config_aggregator" {
  description = "Whether to deploy an AWS Config organization aggregator."
  type        = bool
  default     = true
}

variable "config_aggregator_name" {
  description = "Name of the AWS Config aggregator."
  type        = string
  default     = "organization"
}

variable "config_aggregator_role_arn" {
  description = "IAM role ARN assumed by AWS Config to aggregate data across the organization."
  type        = string
  default     = null
}

variable "cost_allocation_tags" {
  description = "List of cost allocation tag keys to activate."
  type        = list(string)
  default     = [
    "Environment",
    "Owner",
    "CostCenter"
  ]
}
