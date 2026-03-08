terraform {
  required_version = ">= 1.3.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

resource "aws_db_parameter_group" "this" {
  name_prefix = var.identifier
  family      = var.parameter_group_family
  description = var.parameter_group_description

  dynamic "parameter" {
    for_each = var.parameters
    content {
      name         = parameter.key
      value        = parameter.value.value
      apply_method = try(parameter.value.apply_method, null)
    }
  }

  tags = merge(var.tags, {
    "Name" = var.identifier
  })
}

resource "aws_db_instance" "this" {
  identifier = var.identifier

  engine         = var.engine
  engine_version = var.engine_version
  instance_class = var.instance_class

  license_model               = var.license_model
  allocated_storage           = var.allocated_storage
  max_allocated_storage       = var.max_allocated_storage
  storage_type                = var.storage_type
  iops                        = var.iops
  storage_encrypted           = true
  kms_key_id                  = var.kms_key_arn
  multi_az                    = true
  auto_minor_version_upgrade  = var.auto_minor_version_upgrade
  allow_major_version_upgrade = var.allow_major_version_upgrade

  db_subnet_group_name   = var.db_subnet_group_name
  vpc_security_group_ids = var.vpc_security_group_ids
  availability_zone      = var.preferred_primary_az

  username = var.master_username
  password = var.master_password

  manage_master_user_password = var.manage_master_user_password

  backup_retention_period = var.backup_retention_period
  backup_window           = var.backup_window
  maintenance_window      = var.maintenance_window
  copy_tags_to_snapshot   = true
  delete_automated_backups = false
  skip_final_snapshot      = var.skip_final_snapshot
  final_snapshot_identifier = var.skip_final_snapshot ? null : coalesce(var.final_snapshot_identifier, format("%s-final", var.identifier))

  deletion_protection = var.deletion_protection
  publicly_accessible = var.publicly_accessible
  port                = var.port

  monitoring_interval = var.enhanced_monitoring_interval
  monitoring_role_arn = var.monitoring_role_arn

  performance_insights_enabled          = var.performance_insights_enabled
  performance_insights_kms_key_id       = var.performance_insights_kms_key_arn
  performance_insights_retention_period = var.performance_insights_retention_period

  enabled_cloudwatch_logs_exports = var.cloudwatch_logs_exports
  iam_database_authentication_enabled = var.iam_authentication_enabled

  parameter_group_name = aws_db_parameter_group.this.name
  option_group_name    = var.option_group_name

  apply_immediately = var.apply_immediately

  ca_cert_identifier = var.ca_cert_identifier

  tags = merge(var.tags, {
    "Name" = var.identifier
  })
}

