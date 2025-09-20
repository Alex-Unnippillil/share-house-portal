output "log_group_name" {
  description = "CloudWatch log group receiving structured Serilog events."
  value       = aws_cloudwatch_log_group.service.name
}

output "error_alarm_arn" {
  description = "ARN of the log-based error alarm."
  value       = aws_cloudwatch_metric_alarm.error_rate.arn
}

output "latency_alarm_arn" {
  description = "ARN of the log-based latency alarm."
  value       = aws_cloudwatch_metric_alarm.latency_spike.arn
}
