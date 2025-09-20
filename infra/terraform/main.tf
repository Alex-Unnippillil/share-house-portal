terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }

  backend "s3" {
    bucket               = "share-house-portal-terraform-state"
    key                  = "global/terraform.tfstate"
    workspace_key_prefix = "env"
    region               = "us-east-1"
    dynamodb_table       = "share-house-portal-terraform-locks"
    encrypt              = true
  }
}

locals {
  environment_definitions = {
    dev = {
      aws_profile = "share-house-dev"
      aws_region  = "us-east-1"
      stack       = "development"
    }

    staging = {
      aws_profile = "share-house-staging"
      aws_region  = "us-east-1"
      stack       = "staging"
    }

    prod = {
      aws_profile = "share-house-prod"
      aws_region  = "us-east-1"
      stack       = "production"
    }
  }

  default_environment = "dev"

  workspace = terraform.workspace == "default" ? local.default_environment : terraform.workspace

  current_environment = lookup(
    local.environment_definitions,
    local.workspace,
    {
      aws_profile = null
      aws_region  = null
      stack       = local.workspace
    }
  )
}

output "workspace" {
  description = "Normalized workspace name used for selecting environment-specific settings."
  value       = local.workspace
}

output "environment_settings" {
  description = "Environment-specific configuration derived from the current Terraform workspace."
  value       = local.current_environment
  sensitive   = false
}
