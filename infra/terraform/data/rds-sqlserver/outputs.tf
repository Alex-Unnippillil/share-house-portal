output "db_instance_id" {
  description = "ID of the SQL Server RDS instance."
  value       = aws_db_instance.this.id
}

output "db_instance_arn" {
  description = "ARN of the SQL Server RDS instance."
  value       = aws_db_instance.this.arn
}

output "db_instance_endpoint" {
  description = "Writer endpoint address for the SQL Server RDS instance."
  value       = aws_db_instance.this.endpoint
}

output "db_instance_port" {
  description = "Port number for the SQL Server RDS instance."
  value       = aws_db_instance.this.port
}

output "db_instance_resource_id" {
  description = "RDS resource identifier used for CloudWatch and Performance Insights."
  value       = aws_db_instance.this.resource_id
}

output "master_user_secret_arn" {
  description = "ARN of the Secrets Manager secret that stores the master user password when managed by AWS."
  value       = try(aws_db_instance.this.master_user_secret[0].secret_arn, null)
}

output "parameter_group_name" {
  description = "Name of the custom parameter group applied to the SQL Server instance."
  value       = aws_db_parameter_group.this.name
}
