variable "identifier" {
  description = "Unique identifier for the SQL Server instance."
  type        = string
}

variable "engine" {
  description = "Database engine identifier. Defaults to SQL Server Standard Edition."
  type        = string
  default     = "sqlserver-se"
}

variable "engine_version" {
  description = "Engine version to deploy."
  type        = string
  default     = "16.00.4105.4.v1"
}

variable "instance_class" {
  description = "Instance class to use for the SQL Server instance."
  type        = string
  default     = "db.m6i.large"
}

variable "license_model" {
  description = "License model for the SQL Server instance."
  type        = string
  default     = "license-included"
}

variable "allocated_storage" {
  description = "Initial storage allocated in GiB."
  type        = number
  default     = 200
}

variable "max_allocated_storage" {
  description = "Maximum storage in GiB for autoscaling. Set to null to disable autoscaling."
  type        = number
  default     = 1000
}

variable "storage_type" {
  description = "Storage type to use."
  type        = string
  default     = "gp3"
}

variable "iops" {
  description = "Provisioned IOPS for storage types that require it."
  type        = number
  default     = null
}

variable "kms_key_arn" {
  description = "KMS key ARN for storage encryption."
  type        = string
  default     = null
}

variable "auto_minor_version_upgrade" {
  description = "Whether minor engine upgrades are applied automatically."
  type        = bool
  default     = true
}

variable "allow_major_version_upgrade" {
  description = "Whether major engine upgrades are allowed."
  type        = bool
  default     = false
}

variable "db_subnet_group_name" {
  description = "Name of the DB subnet group for the instance."
  type        = string
}

variable "vpc_security_group_ids" {
  description = "List of security groups associated with the instance."
  type        = list(string)
  default     = []
}

variable "preferred_primary_az" {
  description = "Preferred AZ for the primary instance. Leave null to allow AWS to choose."
  type        = string
  default     = null
}

variable "master_username" {
  description = "Master username for the SQL Server instance."
  type        = string
}

variable "master_password" {
  description = "Master password for the SQL Server instance. Leave null when Secrets Manager is managing the password."
  type        = string
  default     = null

  validation {
    condition = var.manage_master_user_password ? (var.master_password == null || var.master_password == "") : (var.master_password != null && var.master_password != "")
    error_message = "Provide master_password only when manage_master_user_password is disabled."
  }
}

variable "manage_master_user_password" {
  description = "Enable AWS Secrets Manager integration for the master user password."
  type        = bool
  default     = true
}

variable "backup_retention_period" {
  description = "Number of days to retain automated backups to enable PITR."
  type        = number
  default     = 14
}

variable "backup_window" {
  description = "Preferred backup window."
  type        = string
  default     = "02:00-04:00"
}

variable "maintenance_window" {
  description = "Preferred maintenance window."
  type        = string
  default     = "sun:05:00-sun:07:00"
}

variable "deletion_protection" {
  description = "Enable deletion protection on the instance."
  type        = bool
  default     = true
}

variable "publicly_accessible" {
  description = "Whether the instance is publicly accessible."
  type        = bool
  default     = false
}

variable "port" {
  description = "Port the instance listens on."
  type        = number
  default     = 1433
}

variable "enhanced_monitoring_interval" {
  description = "Enhanced monitoring interval in seconds. Set to 0 to disable."
  type        = number
  default     = 60
}

variable "monitoring_role_arn" {
  description = "ARN of the IAM role for enhanced monitoring."
  type        = string
  default     = null
}

variable "performance_insights_enabled" {
  description = "Enable Performance Insights."
  type        = bool
  default     = true
}

variable "performance_insights_kms_key_arn" {
  description = "KMS key ARN for encrypting Performance Insights data."
  type        = string
  default     = null
}

variable "performance_insights_retention_period" {
  description = "Retention period (in days) for Performance Insights metrics."
  type        = number
  default     = 7
}

variable "cloudwatch_logs_exports" {
  description = "List of log types to export to CloudWatch Logs."
  type        = list(string)
  default     = ["error", "agent"]
}

variable "iam_authentication_enabled" {
  description = "Enable IAM database authentication."
  type        = bool
  default     = false
}

variable "option_group_name" {
  description = "Existing option group to associate with the instance."
  type        = string
  default     = null
}

variable "apply_immediately" {
  description = "Apply modifications immediately instead of during the maintenance window."
  type        = bool
  default     = false
}

variable "ca_cert_identifier" {
  description = "Identifier of the CA certificate for the DB instance."
  type        = string
  default     = null
}

variable "skip_final_snapshot" {
  description = "Skip creating a final snapshot before instance deletion."
  type        = bool
  default     = false
}

variable "final_snapshot_identifier" {
  description = "Name of the final snapshot when the instance is deleted."
  type        = string
  default     = null
}

variable "parameter_group_family" {
  description = "Family of the SQL Server parameter group."
  type        = string
  default     = "sqlserver-se-16.0"
}

variable "parameter_group_description" {
  description = "Description for the parameter group."
  type        = string
  default     = "SQL Server parameter overrides"
}

variable "parameters" {
  description = "Map of parameter overrides for the SQL Server parameter group."
  type = map(object({
    value        = string
    apply_method = optional(string)
  }))
  default = {}
}

variable "tags" {
  description = "Map of tags to apply to resources."
  type        = map(string)
  default     = {}
}
