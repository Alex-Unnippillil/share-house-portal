terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

resource "aws_cloudwatch_log_group" "service" {
  name              = var.log_group_name
  retention_in_days = var.retention_in_days
  kms_key_id        = var.kms_key_arn

  tags = var.tags
}

resource "aws_cloudwatch_log_metric_filter" "error_count" {
  name           = var.error_metric_name
  log_group_name = aws_cloudwatch_log_group.service.name
  pattern        = "{ $.level = \"Error\" || $.level = \"Fatal\" }"

  metric_transformation {
    name      = var.error_metric_name
    namespace = var.metric_namespace
    value     = "1"
    unit      = "Count"
  }
}

resource "aws_cloudwatch_metric_alarm" "error_rate" {
  alarm_name                = var.error_alarm_name
  alarm_description         = "Alert when structured logs report more than ${var.error_threshold} errors per period"
  comparison_operator       = "GreaterThanThreshold"
  evaluation_periods        = var.evaluation_periods
  threshold                 = var.error_threshold
  treat_missing_data        = "notBreaching"
  datapoints_to_alarm       = var.datapoints_to_alarm
  metric_name               = var.error_metric_name
  namespace                 = var.metric_namespace
  statistic                 = "Sum"
  period                    = var.period_seconds
  alarm_actions             = var.alarm_actions
  ok_actions                = var.ok_actions
  insufficient_data_actions = var.insufficient_data_actions
}

resource "aws_cloudwatch_log_metric_filter" "latency_p99" {
  name           = var.latency_metric_name
  log_group_name = aws_cloudwatch_log_group.service.name
  pattern        = "{ $.metrics.request.durationMs >= 1000 }"

  metric_transformation {
    name      = var.latency_metric_name
    namespace = var.metric_namespace
    value     = "1"
    unit      = "Count"
  }
}

resource "aws_cloudwatch_metric_alarm" "latency_spike" {
  alarm_name          = var.latency_alarm_name
  alarm_description   = "Alert when > ${var.latency_threshold} requests exceed 1s latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.evaluation_periods
  threshold           = var.latency_threshold
  treat_missing_data  = "notBreaching"
  datapoints_to_alarm = var.datapoints_to_alarm
  metric_name         = var.latency_metric_name
  namespace           = var.metric_namespace
  statistic           = "Sum"
  period              = var.period_seconds
  alarm_actions       = var.alarm_actions
  ok_actions          = var.ok_actions
  insufficient_data_actions = var.insufficient_data_actions
}
