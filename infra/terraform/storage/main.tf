terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

data "aws_caller_identity" "current" {}

locals {
  bucket_prefix = lower("${var.bucket_prefix}-${var.environment}")

  common_tags = {
    Application = var.bucket_prefix
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  bucket_definitions = {
    documents = {
      description        = "Long-lived user and business documents (leases, agreements, IDs)."
      kms_description    = "KMS key for encrypting documents bucket objects."
      allowed_principals = var.documents_bucket_allowed_principals
      bucket_actions     = ["s3:GetBucketLocation", "s3:ListBucket"]
      object_actions     = ["s3:GetObject", "s3:GetObjectVersion", "s3:PutObject", "s3:DeleteObject", "s3:DeleteObjectVersion"]
      lifecycle_rules = [
        {
          id                                     = "documents-archive"
          status                                 = "Enabled"
          transitions                            = [{ days = 90, storage_class = "STANDARD_IA" }]
          noncurrent_transitions                 = [{ days = 180, storage_class = "GLACIER" }]
          noncurrent_expiration_days             = 1095
          abort_incomplete_multipart_upload_days = 7
        }
      ]
      object_lock = null
    }

    images = {
      description        = "Listing and marketing imagery served by the web experience."
      kms_description    = "KMS key for encrypting images bucket objects."
      allowed_principals = var.images_bucket_allowed_principals
      bucket_actions     = ["s3:GetBucketLocation", "s3:ListBucket"]
      object_actions     = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:DeleteObjectVersion"]
      lifecycle_rules = [
        {
          id                                     = "images-trim-versions"
          status                                 = "Enabled"
          noncurrent_expiration_days             = 90
          abort_incomplete_multipart_upload_days = 7
        }
      ]
      object_lock = null
    }

    exports = {
      description        = "Short-lived analytics exports shared with partners and operators."
      kms_description    = "KMS key for encrypting exports bucket objects."
      allowed_principals = var.exports_bucket_allowed_principals
      bucket_actions     = ["s3:ListBucket"]
      object_actions     = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
      lifecycle_rules = [
        {
          id                                     = "exports-expire"
          status                                 = "Enabled"
          expiration_days                        = 30
          abort_incomplete_multipart_upload_days = 3
        }
      ]
      object_lock = null
    }

    artifacts = {
      description        = "Build artifacts and deployment bundles from CI/CD pipelines."
      kms_description    = "KMS key for encrypting artifacts bucket objects."
      allowed_principals = var.artifacts_bucket_allowed_principals
      bucket_actions     = ["s3:GetBucketLocation", "s3:ListBucket"]
      object_actions     = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:AbortMultipartUpload"]
      lifecycle_rules = [
        {
          id                                     = "artifacts-cleanup"
          status                                 = "Enabled"
          expiration_days                        = 180
          abort_incomplete_multipart_upload_days = 7
        }
      ]
      object_lock = null
    }

    backups = {
      description        = "Immutable database and configuration backups for compliance."
      kms_description    = "KMS key for encrypting backups bucket objects."
      allowed_principals = var.backups_bucket_allowed_principals
      bucket_actions     = ["s3:ListBucket"]
      object_actions     = ["s3:GetObject", "s3:PutObject"]
      lifecycle_rules = [
        {
          id                                     = "backups-archive"
          status                                 = "Enabled"
          transitions                            = [{ days = 30, storage_class = "GLACIER" }]
          expiration_days                        = 3650
          abort_incomplete_multipart_upload_days = 7
        }
      ]
      object_lock = {
        mode = "COMPLIANCE"
        days = 365
      }
    }
  }
}

locals {
  bucket_names = { for bucket_key, _ in local.bucket_definitions : bucket_key => "${local.bucket_prefix}-${bucket_key}" }
}

data "aws_iam_policy_document" "kms_default" {
  for_each = local.bucket_definitions

  statement {
    sid     = "AllowRootAccount"
    effect  = "Allow"
    actions = ["kms:*"]

    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"]
    }

    resources = ["*"]
  }

  statement {
    sid    = "AllowS3Service"
    effect = "Allow"
    actions = [
      "kms:Decrypt",
      "kms:DescribeKey",
      "kms:GenerateDataKey"
    ]

    principals {
      type        = "Service"
      identifiers = ["s3.amazonaws.com"]
    }

    resources = ["*"]
  }
}

data "aws_iam_policy_document" "kms_principals" {
  for_each = { for k, v in local.bucket_definitions : k => v if length(v.allowed_principals) > 0 }

  statement {
    sid    = "AllowBucketConsumers${title(each.key)}"
    effect = "Allow"
    actions = [
      "kms:Decrypt",
      "kms:DescribeKey",
      "kms:Encrypt",
      "kms:GenerateDataKey",
      "kms:ReEncryptFrom",
      "kms:ReEncryptTo"
    ]

    principals {
      type        = "AWS"
      identifiers = each.value.allowed_principals
    }

    resources = ["*"]
  }
}

data "aws_iam_policy_document" "kms_with_principals" {
  for_each = data.aws_iam_policy_document.kms_principals

  source_policy_documents = [
    data.aws_iam_policy_document.kms_default[each.key].json,
    data.aws_iam_policy_document.kms_principals[each.key].json
  ]
}

resource "aws_kms_key" "bucket" {
  for_each = local.bucket_definitions

  description             = each.value.kms_description
  enable_key_rotation     = true
  deletion_window_in_days = 30
  policy                  = try(data.aws_iam_policy_document.kms_with_principals[each.key].json, data.aws_iam_policy_document.kms_default[each.key].json)

  tags = merge(local.common_tags, {
    "Bucket"      = each.key,
    "DataPurpose" = each.value.description
  })
}

resource "aws_kms_alias" "bucket" {
  for_each = local.bucket_definitions

  name          = "alias/${local.bucket_names[each.key]}"
  target_key_id = aws_kms_key.bucket[each.key].key_id
}

resource "aws_s3_bucket" "bucket" {
  for_each = local.bucket_definitions

  bucket              = local.bucket_names[each.key]
  force_destroy       = false
  object_lock_enabled = each.value.object_lock != null

  tags = merge(local.common_tags, {
    "Bucket"      = each.key,
    "DataPurpose" = each.value.description
  })
}

resource "aws_s3_bucket_versioning" "bucket" {
  for_each = aws_s3_bucket.bucket

  bucket = each.value.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "bucket" {
  for_each = aws_s3_bucket.bucket

  bucket = each.value.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.bucket[each.key].arn
      sse_algorithm     = "aws:kms"
    }

    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "bucket" {
  for_each = aws_s3_bucket.bucket

  bucket = each.value.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_object_lock_configuration" "bucket" {
  for_each = { for k, v in local.bucket_definitions : k => v if v.object_lock != null }

  bucket = aws_s3_bucket.bucket[each.key].id

  rule {
    default_retention {
      mode = each.value.object_lock.mode
      days = lookup(each.value.object_lock, "days", null)
    }
  }

  depends_on = [aws_s3_bucket_versioning.bucket]
}

resource "aws_s3_bucket_lifecycle_configuration" "bucket" {
  for_each = aws_s3_bucket.bucket

  bucket = each.value.id

  dynamic "rule" {
    for_each = lookup(local.bucket_definitions[each.key], "lifecycle_rules", [])

    content {
      id     = rule.value.id
      status = rule.value.status

      filter {
        prefix = lookup(rule.value, "prefix", "")
      }

      dynamic "transition" {
        for_each = lookup(rule.value, "transitions", [])

        content {
          days          = transition.value.days
          storage_class = transition.value.storage_class
        }
      }

      dynamic "noncurrent_version_transition" {
        for_each = lookup(rule.value, "noncurrent_transitions", [])

        content {
          noncurrent_days = noncurrent_version_transition.value.days
          storage_class   = noncurrent_version_transition.value.storage_class
        }
      }

      dynamic "expiration" {
        for_each = lookup(rule.value, "expiration_days", null) == null ? [] : [lookup(rule.value, "expiration_days", null)]

        content {
          days = expiration.value
        }
      }

      dynamic "noncurrent_version_expiration" {
        for_each = lookup(rule.value, "noncurrent_expiration_days", null) == null ? [] : [lookup(rule.value, "noncurrent_expiration_days", null)]

        content {
          noncurrent_days = noncurrent_version_expiration.value
        }
      }

      dynamic "abort_incomplete_multipart_upload" {
        for_each = lookup(rule.value, "abort_incomplete_multipart_upload_days", null) == null ? [] : [lookup(rule.value, "abort_incomplete_multipart_upload_days", null)]

        content {
          days_after_initiation = abort_incomplete_multipart_upload.value
        }
      }
    }
  }
}

data "aws_iam_policy_document" "bucket_base" {
  for_each = aws_s3_bucket.bucket

  statement {
    sid     = "EnforceTLS"
    effect  = "Deny"
    actions = ["s3:*"]

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    resources = [
      aws_s3_bucket.bucket[each.key].arn,
      "${aws_s3_bucket.bucket[each.key].arn}/*"
    ]

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

data "aws_iam_policy_document" "bucket_consumers" {
  for_each = { for k, v in local.bucket_definitions : k => v if length(v.allowed_principals) > 0 }

  statement {
    sid     = "AllowBucketLevelAccess"
    effect  = "Allow"
    actions = lookup(each.value, "bucket_actions", [])

    principals {
      type        = "AWS"
      identifiers = each.value.allowed_principals
    }

    resources = [aws_s3_bucket.bucket[each.key].arn]
  }

  statement {
    sid     = "AllowObjectLevelAccess"
    effect  = "Allow"
    actions = lookup(each.value, "object_actions", [])

    principals {
      type        = "AWS"
      identifiers = each.value.allowed_principals
    }

    resources = ["${aws_s3_bucket.bucket[each.key].arn}/*"]
  }
}

data "aws_iam_policy_document" "bucket_policy" {
  for_each = aws_s3_bucket.bucket

  source_policy_documents = compact([
    data.aws_iam_policy_document.bucket_base[each.key].json,
    try(data.aws_iam_policy_document.bucket_consumers[each.key].json, null)
  ])
}

resource "aws_s3_bucket_policy" "bucket" {
  for_each = data.aws_iam_policy_document.bucket_policy

  bucket = aws_s3_bucket.bucket[each.key].id
  policy = data.aws_iam_policy_document.bucket_policy[each.key].json
}
