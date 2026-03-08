output "bucket_names" {
  description = "S3 bucket names keyed by logical bucket identifier."
  value       = { for key, bucket in aws_s3_bucket.bucket : key => bucket.bucket }
}

output "bucket_arns" {
  description = "S3 bucket ARNs keyed by logical bucket identifier."
  value       = { for key, bucket in aws_s3_bucket.bucket : key => bucket.arn }
}

output "kms_key_arns" {
  description = "KMS key ARNs protecting each storage bucket."
  value       = { for key, key_resource in aws_kms_key.bucket : key => key_resource.arn }
}
