# SQL Server RDS Module

This Terraform module provisions a production-ready Amazon RDS for SQL Server instance that is hardened for availability and operational resilience. The instance is deployed in a Multi-AZ configuration with encrypted storage, automated backups, point-in-time recovery (PITR), and a customizable parameter group so the service can be tuned for Share House Portal workloads.

## Features

- Multi-AZ deployment for high availability and automatic failover.
- Storage encryption using AWS Key Management Service (KMS).
- Automated backups with configurable retention and preferred windows to support PITR.
- Custom parameter group for SQL Server engine tuning.
- Performance Insights with optional KMS encryption to provide workload visibility.
- Enhanced monitoring, CloudWatch log exports, and IAM database authentication toggles.

## Usage

```hcl
module "rds_sqlserver" {
  source = "./infra/terraform/data/rds-sqlserver"

  identifier              = "share-house-sqlserver"
  db_subnet_group_name    = aws_db_subnet_group.data.name
  vpc_security_group_ids  = [aws_security_group.db.id]
  master_username         = "dbadmin"
  manage_master_user_password = true

  backup_retention_period = 14
  backup_window           = "02:00-04:00"
  maintenance_window      = "sun:05:00-sun:07:00"

  parameters = {
    "cost threshold for parallelism" = {
      value        = "50"
      apply_method = "pending-reboot"
    }
  }

  tags = {
    Environment = "production"
    Service     = "share-house-portal"
  }
}
```

## Performance Insights

Performance Insights is enabled by default to capture wait events and query metrics for the SQL Server instance. If you need to disable Performance Insights or supply a dedicated KMS key/retention period, use the `performance_insights_enabled`, `performance_insights_kms_key_arn`, and `performance_insights_retention_period` variables.

## Read Replica Strategy

Amazon RDS for SQL Server does not currently support managed read replicas. This module intentionally exposes a placeholder section so the team can document future strategies (for example, Always On availability groups or change data capture pipelines) when AWS adds native support or when an alternative pattern is selected.

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| `identifier` | Unique identifier for the SQL Server instance. | `string` | n/a | yes |
| `engine` | Database engine identifier. Defaults to SQL Server Standard Edition. | `string` | `"sqlserver-se"` | no |
| `engine_version` | Engine version to deploy. | `string` | `"16.00.4105.4.v1"` | no |
| `instance_class` | Instance class to use for the SQL Server instance. | `string` | `"db.m6i.large"` | no |
| `license_model` | License model for the SQL Server instance. | `string` | `"license-included"` | no |
| `allocated_storage` | Initial storage allocated in GiB. | `number` | `200` | no |
| `max_allocated_storage` | Maximum storage in GiB for autoscaling. Set to null to disable autoscaling. | `number` | `1000` | no |
| `storage_type` | Storage type to use. | `string` | `"gp3"` | no |
| `iops` | Provisioned IOPS for storage types that require it. | `number` | `null` | no |
| `kms_key_arn` | KMS key ARN for storage encryption. | `string` | `null` | no |
| `auto_minor_version_upgrade` | Whether minor engine upgrades are applied automatically. | `bool` | `true` | no |
| `allow_major_version_upgrade` | Whether major engine upgrades are allowed. | `bool` | `false` | no |
| `db_subnet_group_name` | Name of the DB subnet group for the instance. | `string` | n/a | yes |
| `vpc_security_group_ids` | List of security groups associated with the instance. | `list(string)` | `[]` | no |
| `preferred_primary_az` | Preferred AZ for the primary instance. Leave null to allow AWS to choose. | `string` | `null` | no |
| `master_username` | Master username for the SQL Server instance. | `string` | n/a | yes |
| `master_password` | Master password for the SQL Server instance. Leave null when Secrets Manager is managing the password. | `string` | `null` | no |
| `manage_master_user_password` | Enable AWS Secrets Manager integration for the master user password. | `bool` | `true` | no |
| `backup_retention_period` | Number of days to retain automated backups to enable PITR. | `number` | `14` | no |
| `backup_window` | Preferred backup window. | `string` | `"02:00-04:00"` | no |
| `maintenance_window` | Preferred maintenance window. | `string` | `"sun:05:00-sun:07:00"` | no |
| `deletion_protection` | Enable deletion protection on the instance. | `bool` | `true` | no |
| `publicly_accessible` | Whether the instance is publicly accessible. | `bool` | `false` | no |
| `port` | Port the instance listens on. | `number` | `1433` | no |
| `enhanced_monitoring_interval` | Enhanced monitoring interval in seconds. Set to 0 to disable. | `number` | `60` | no |
| `monitoring_role_arn` | ARN of the IAM role for enhanced monitoring. | `string` | `null` | no |
| `performance_insights_enabled` | Enable Performance Insights. | `bool` | `true` | no |
| `performance_insights_kms_key_arn` | KMS key ARN for encrypting Performance Insights data. | `string` | `null` | no |
| `performance_insights_retention_period` | Retention period (in days) for Performance Insights metrics. | `number` | `7` | no |
| `cloudwatch_logs_exports` | List of log types to export to CloudWatch Logs. | `list(string)` | `["error", "agent"]` | no |
| `iam_authentication_enabled` | Enable IAM database authentication. | `bool` | `false` | no |
| `option_group_name` | Existing option group to associate with the instance. | `string` | `null` | no |
| `apply_immediately` | Apply modifications immediately instead of during the maintenance window. | `bool` | `false` | no |
| `ca_cert_identifier` | Identifier of the CA certificate for the DB instance. | `string` | `null` | no |
| `skip_final_snapshot` | Skip creating a final snapshot before instance deletion. | `bool` | `false` | no |
| `final_snapshot_identifier` | Name of the final snapshot when the instance is deleted. | `string` | `null` | no |
| `parameter_group_family` | Family of the SQL Server parameter group. | `string` | `"sqlserver-se-16.0"` | no |
| `parameter_group_description` | Description for the parameter group. | `string` | `"SQL Server parameter overrides"` | no |
| `parameters` | Map of parameter overrides for the SQL Server parameter group. | `map(object({ value = string, apply_method = optional(string) }))` | `{}` | no |
| `tags` | Map of tags to apply to resources. | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| `db_instance_id` | ID of the SQL Server RDS instance. |
| `db_instance_arn` | ARN of the SQL Server RDS instance. |
| `db_instance_endpoint` | Writer endpoint address for the SQL Server RDS instance. |
| `db_instance_port` | Port number for the SQL Server RDS instance. |
| `db_instance_resource_id` | RDS resource identifier used for CloudWatch and Performance Insights. |
| `master_user_secret_arn` | ARN of the Secrets Manager secret that stores the master user password when managed by AWS. |
| `parameter_group_name` | Name of the custom parameter group applied to the SQL Server instance. |
