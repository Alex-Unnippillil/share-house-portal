output "sns_topic_arns" {
  description = "Map of SNS topic ARNs keyed by logical channel name."
  value       = { for key, topic in aws_sns_topic.topics : key => topic.arn }
}

output "sqs_queue_arns" {
  description = "Map of primary SQS queue ARNs keyed by logical channel name."
  value       = { for key, queue in aws_sqs_queue.queue : key => queue.arn }
}

output "sqs_dead_letter_queue_arns" {
  description = "Map of SQS dead-letter queue ARNs keyed by logical channel name."
  value       = { for key, queue in aws_sqs_queue.dlq : key => queue.arn }
}
