terraform {
  required_version = ">= 1.4.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

variable "name_prefix" {
  description = "Prefix applied to created resources such as IAM roles."
  type        = string
  default     = "share-house"
}

variable "default_tags" {
  description = "Tags applied to all managed resources."
  type        = map(string)
  default     = {}
}

variable "secrets_manager_secrets" {
  description = <<-EOT
  Map of Secrets Manager secrets to create. The key is the secret name, and the value
  controls configuration, tags, rotation, and optional initial value.
  EOT
  type = map(object({
    description          = optional(string)
    kms_key_id           = optional(string)
    secret_string        = optional(string)
    tags                 = optional(map(string))
    recovery_window_days = optional(number)
    rotation_lambda_arn  = optional(string)
    rotation_days        = optional(number)
  }))
  default = {}
}

variable "ssm_parameters" {
  description = <<-EOT
  Map of SSM Parameter Store entries to create. Each key is the parameter name and
  rotation is implemented through an EventBridge schedule that invokes the supplied
  Lambda function.
  EOT
  type = map(object({
    value                        = string
    type                         = optional(string, "SecureString")
    description                  = optional(string)
    key_id                       = optional(string)
    tier                         = optional(string)
    allowed_pattern              = optional(string)
    data_type                    = optional(string)
    tags                         = optional(map(string))
    rotation_lambda_arn          = optional(string)
    rotation_schedule_expression = optional(string)
    rotation_flexible_time_window = optional(object({
      mode           = string
      maximum_window = optional(number)
      minimum_window = optional(number)
    }))
  }))
  default = {}
}

variable "service_access" {
  description = <<-EOT
  Map describing IAM roles that can read specific secrets. Each object defines the
  AWS service principal, the secrets and parameters the service needs access to, and
  optional tagging.
  EOT
  type = map(object({
    role_name                    = optional(string)
    description                  = optional(string)
    principal_service            = string
    secrets_manager_secret_names = optional(list(string))
    secret_arns                  = optional(list(string))
    parameter_names              = optional(list(string))
    parameter_arns               = optional(list(string))
    tags                         = optional(map(string))
  }))
  default = {}
}

locals {
  secrets_with_rotation = {
    for name, cfg in var.secrets_manager_secrets :
    name => cfg
    if try(coalesce(cfg.rotation_lambda_arn, ""), "") != "" && try(cfg.rotation_days, 0) > 0
  }

  parameters_with_rotation = {
    for name, cfg in var.ssm_parameters :
    name => cfg
    if try(coalesce(cfg.rotation_lambda_arn, ""), "") != "" && try(coalesce(cfg.rotation_schedule_expression, ""), "") != ""
  }
}


resource "aws_secretsmanager_secret" "this" {
  for_each = var.secrets_manager_secrets

  name        = each.key
  description = try(each.value.description, null)
  kms_key_id  = try(each.value.kms_key_id, null)
  recovery_window_in_days = try(each.value.recovery_window_days, null)

  tags = merge(var.default_tags, coalesce(try(each.value.tags, null), {}))
}

resource "aws_secretsmanager_secret_version" "initial" {
  for_each = {
    for name, cfg in var.secrets_manager_secrets :
    name => cfg if try(cfg.secret_string, null) != null
  }

  secret_id     = aws_secretsmanager_secret.this[each.key].id
  secret_string = each.value.secret_string
}

resource "aws_secretsmanager_secret_rotation" "this" {
  for_each = local.secrets_with_rotation

  secret_id          = aws_secretsmanager_secret.this[each.key].id
  rotation_lambda_arn = each.value.rotation_lambda_arn

  rotation_rules {
    automatically_after_days = each.value.rotation_days
  }
}

resource "aws_ssm_parameter" "this" {
  for_each = var.ssm_parameters

  name        = each.key
  description = try(each.value.description, null)
  type        = try(each.value.type, "SecureString")
  value       = each.value.value
  key_id      = try(each.value.key_id, null)
  tier        = try(each.value.tier, null)
  allowed_pattern = try(each.value.allowed_pattern, null)
  data_type       = try(each.value.data_type, null)

  tags = merge(var.default_tags, coalesce(try(each.value.tags, null), {}))
}

resource "aws_scheduler_schedule" "parameter_rotation" {
  for_each = {
    for name, cfg in local.parameters_with_rotation :
    name => cfg if try(cfg.rotation_flexible_time_window, null) == null
  }

  name       = "ssm-rotation-${substr(md5(each.key), 0, 12)}"
  group_name = "default"

  schedule_expression = each.value.rotation_schedule_expression

  target {
    arn   = each.value.rotation_lambda_arn
    input = jsonencode({
      parameter_name = aws_ssm_parameter.this[each.key].name
    })
  }

  flexible_time_window {
    mode = "OFF"
  }

  tags = merge(var.default_tags, coalesce(try(each.value.tags, null), {}))
}

resource "aws_scheduler_schedule" "parameter_rotation_flexible" {
  for_each = {
    for name, cfg in local.parameters_with_rotation :
    name => cfg if try(cfg.rotation_flexible_time_window, null) != null
  }

  name       = "ssm-rotation-${substr(md5(each.key), 0, 12)}"
  group_name = "default"

  schedule_expression = each.value.rotation_schedule_expression

  target {
    arn   = each.value.rotation_lambda_arn
    input = jsonencode({
      parameter_name = aws_ssm_parameter.this[each.key].name
    })
  }

  flexible_time_window {
    mode            = each.value.rotation_flexible_time_window.mode
    maximum_window_in_minutes = try(each.value.rotation_flexible_time_window.maximum_window, null)
    minimum_window_in_minutes = try(each.value.rotation_flexible_time_window.minimum_window, null)
  }

  tags = merge(var.default_tags, coalesce(try(each.value.tags, null), {}))
}

resource "aws_lambda_permission" "parameter_rotation" {
  for_each = local.parameters_with_rotation

  statement_id  = "AllowScheduler-${substr(md5(each.key), 0, 12)}"
  action        = "lambda:InvokeFunction"
  function_name = each.value.rotation_lambda_arn
  principal     = "scheduler.amazonaws.com"
  source_arn = try(
    aws_scheduler_schedule.parameter_rotation[each.key].arn,
    aws_scheduler_schedule.parameter_rotation_flexible[each.key].arn
  )
}

locals {
  secret_arns_by_name = { for name, secret in aws_secretsmanager_secret.this : name => secret.arn }
  parameter_arns_by_name = { for name, param in aws_ssm_parameter.this : name => param.arn }

  service_secret_arns = {
    for service, cfg in var.service_access :
    service => concat(
      [
        for secret_name in coalesce(try(cfg.secrets_manager_secret_names, null), []) :
        local.secret_arns_by_name[secret_name]
      ],
      coalesce(try(cfg.secret_arns, null), [])
    )
  }

  service_parameter_arns = {
    for service, cfg in var.service_access :
    service => concat(
      [
        for parameter_name in coalesce(try(cfg.parameter_names, null), []) :
        local.parameter_arns_by_name[parameter_name]
      ],
      coalesce(try(cfg.parameter_arns, null), [])
    )
  }
}

data "aws_iam_policy_document" "service_assume" {
  for_each = var.service_access

  statement {
    effect = "Allow"

    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = [each.value.principal_service]
    }
  }
}

data "aws_iam_policy_document" "service_read" {
  for_each = var.service_access

  dynamic "statement" {
    for_each = length(local.service_secret_arns[each.key]) > 0 ? [true] : []

    content {
      sid     = "SecretsManagerRead"
      effect  = "Allow"
      actions = [
        "secretsmanager:DescribeSecret",
        "secretsmanager:GetSecretValue"
      ]
      resources = local.service_secret_arns[each.key]
    }
  }

  dynamic "statement" {
    for_each = length(local.service_parameter_arns[each.key]) > 0 ? [true] : []

    content {
      sid     = "SSMParameterRead"
      effect  = "Allow"
      actions = [
        "ssm:GetParameter",
        "ssm:GetParameterHistory",
        "ssm:GetParameters",
        "ssm:GetParametersByPath"
      ]
      resources = local.service_parameter_arns[each.key]
    }
  }
}

resource "aws_iam_role" "service" {
  for_each = var.service_access

  name        = try(each.value.role_name, "${var.name_prefix}-${each.key}-secrets")
  description = try(each.value.description, null)

  assume_role_policy = data.aws_iam_policy_document.service_assume[each.key].json

  tags = merge(var.default_tags, coalesce(try(each.value.tags, null), {}))
}

resource "aws_iam_role_policy" "service_read" {
  for_each = {
    for key, cfg in var.service_access :
    key => cfg if length(local.service_secret_arns[key]) + length(local.service_parameter_arns[key]) > 0
  }

  name   = "${var.name_prefix}-${each.key}-secret-read"
  role   = aws_iam_role.service[each.key].id
  policy = data.aws_iam_policy_document.service_read[each.key].json
}

output "secretsmanager_secret_arns" {
  description = "ARNs of the Secrets Manager secrets created by this module."
  value       = { for name, secret in aws_secretsmanager_secret.this : name => secret.arn }
}

output "ssm_parameter_arns" {
  description = "ARNs of the Parameter Store entries created by this module."
  value       = { for name, param in aws_ssm_parameter.this : name => param.arn }
}

output "service_role_arns" {
  description = "IAM role ARNs provisioned for service access to secrets."
  value       = { for name, role in aws_iam_role.service : name => role.arn }
}
