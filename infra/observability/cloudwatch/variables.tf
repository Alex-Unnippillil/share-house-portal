variable "region" {
  description = "AWS region where the CloudWatch resources should be created."
  type        = string
}

variable "log_group_name" {
  description = "Name of the CloudWatch log group where the .NET service writes structured logs."
  type        = string
}

variable "retention_in_days" {
  description = "Retention for the log group."
  type        = number
  default     = 30
}

variable "kms_key_arn" {
  description = "Optional CMK ARN for encrypting log data at rest."
  type        = string
  default     = null
}

variable "metric_namespace" {
  description = "Namespace used for metric filters derived from logs."
  type        = string
  default     = "ShareHouse/Logs"
}

variable "error_metric_name" {
  description = "Name of the log-derived metric that counts error events."
  type        = string
  default     = "ShareHouseApiErrorCount"
}

variable "latency_metric_name" {
  description = "Name of the log-derived metric that counts requests slower than the configured threshold."
  type        = string
  default     = "ShareHouseApiHighLatencyCount"
}

variable "error_alarm_name" {
  description = "Name of the CloudWatch alarm for error bursts."
  type        = string
  default     = "share-house-api-error-burst"
}

variable "latency_alarm_name" {
  description = "Name of the CloudWatch alarm for latency spikes."
  type        = string
  default     = "share-house-api-latency-spike"
}

variable "error_threshold" {
  description = "Number of error logs within the evaluation period that will trigger the alarm."
  type        = number
  default     = 5
}

variable "latency_threshold" {
  description = "Number of high-latency requests within the evaluation period that will trigger the alarm."
  type        = number
  default     = 3
}

variable "evaluation_periods" {
  description = "Number of periods over which data is compared to the threshold."
  type        = number
  default     = 1
}

variable "datapoints_to_alarm" {
  description = "The number of datapoints that must exceed the threshold to trigger the alarm."
  type        = number
  default     = 1
}

variable "period_seconds" {
  description = "Granularity, in seconds, of the evaluation window."
  type        = number
  default     = 60
}

variable "alarm_actions" {
  description = "List of ARNs to notify when an alarm enters the ALARM state."
  type        = list(string)
  default     = []
}

variable "ok_actions" {
  description = "List of ARNs to notify when an alarm enters the OK state."
  type        = list(string)
  default     = []
}

variable "insufficient_data_actions" {
  description = "List of ARNs to notify when an alarm enters the INSUFFICIENT_DATA state."
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Common tags to apply to all resources."
  type        = map(string)
  default     = {}
}
