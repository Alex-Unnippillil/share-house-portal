terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

locals {
  base_tags = merge({
    Environment = var.environment
    ManagedBy   = "terraform"
    Component   = "messaging"
  }, var.tags)

  messaging_channels = {
    tenant_applications = {
      topic = {
        name         = "tenant-applications-topic"
        display_name = "Tenant applications events"
      }

      queue = {
        name                       = "tenant-applications-queue"
        visibility_timeout_seconds = 60
        max_receive_count          = 5
        message_retention_seconds  = 1209600
      }
    }

    maintenance_requests = {
      topic = {
        name         = "maintenance-requests-topic"
        display_name = "Maintenance requests events"
      }

      queue = {
        name                       = "maintenance-requests-queue"
        visibility_timeout_seconds = 60
        max_receive_count          = 5
        message_retention_seconds  = 1209600
      }
    }

    rent_payments = {
      topic = {
        name         = "rent-payments-topic"
        display_name = "Rent payment events"
      }

      queue = {
        name                       = "rent-payments-queue"
        visibility_timeout_seconds = 60
        max_receive_count          = 5
        message_retention_seconds  = 1209600
      }
    }
  }
}

resource "aws_sns_topic" "topics" {
  for_each = local.messaging_channels

  name         = "${var.environment}-${each.value.topic.name}"
  display_name = each.value.topic.display_name

  tags = local.base_tags
}

resource "aws_sqs_queue" "dlq" {
  for_each = local.messaging_channels

  name                       = "${var.environment}-${each.value.queue.name}-dlq"
  message_retention_seconds  = each.value.queue.message_retention_seconds
  visibility_timeout_seconds = each.value.queue.visibility_timeout_seconds

  tags = local.base_tags
}

resource "aws_sqs_queue" "queue" {
  for_each = local.messaging_channels

  name                       = "${var.environment}-${each.value.queue.name}"
  visibility_timeout_seconds = each.value.queue.visibility_timeout_seconds
  message_retention_seconds  = each.value.queue.message_retention_seconds

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq[each.key].arn
    maxReceiveCount     = each.value.queue.max_receive_count
  })

  tags = local.base_tags
}

resource "aws_sns_topic_subscription" "queue" {
  for_each = local.messaging_channels

  topic_arn = aws_sns_topic.topics[each.key].arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.queue[each.key].arn

  raw_message_delivery = true
}

data "aws_iam_policy_document" "sns_to_sqs" {
  for_each = aws_sqs_queue.queue

  statement {
    sid    = "AllowSNSPublish"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["sns.amazonaws.com"]
    }

    actions = [
      "sqs:SendMessage"
    ]

    resources = [each.value.arn]

    condition {
      test     = "ArnEquals"
      variable = "aws:SourceArn"
      values   = [aws_sns_topic.topics[each.key].arn]
    }
  }
}

resource "aws_sqs_queue_policy" "queue" {
  for_each = aws_sqs_queue.queue

  queue_url = each.value.url
  policy    = data.aws_iam_policy_document.sns_to_sqs[each.key].json
}
