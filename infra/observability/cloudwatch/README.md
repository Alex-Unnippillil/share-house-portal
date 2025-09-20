# CloudWatch Structured Logging Module

The Terraform in this directory provisions the CloudWatch resources required for
structured JSON logs emitted by the .NET services via Serilog. It creates the
log group, enforces the retention policy, and defines log metric filters that
power alerting.

## Resources

- `aws_cloudwatch_log_group` – `/eks/share-house/api` by default, retaining
  records for 30 days (configurable) and optionally encrypted with a CMK.
- `aws_cloudwatch_log_metric_filter.error_count` – counts log events whose
  `level` field equals `Error` or `Fatal`.
- `aws_cloudwatch_metric_alarm.error_rate` – alarms when more than
  `error_threshold` error events occur in a single evaluation period.
- `aws_cloudwatch_log_metric_filter.latency_p99` – counts requests whose
  `metrics.request.durationMs` field is 1 second or higher.
- `aws_cloudwatch_metric_alarm.latency_spike` – alarms when the count of slow
  requests exceeds the configured threshold.

## Example usage

```hcl
module "api_logging" {
  source = "./infra/observability/cloudwatch"

  region            = "us-east-1"
  log_group_name    = "/eks/share-house/api"
  retention_in_days = 30
  alarm_actions     = [aws_sns_topic.pagerduty.arn]
  ok_actions        = [aws_sns_topic.pagerduty.arn]
  tags = {
    application = "share-house"
    environment = "production"
  }
}
```

Run `terraform init` and `terraform apply` from the repository root after
setting the required AWS credentials (typically via an IAM role with permissions
for CloudWatch Logs and Alarms).
