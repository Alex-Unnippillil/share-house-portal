output "api_web_acl_arn" {
  description = "ARN of the regional Web ACL applied to API Gateway stages and ALBs."
  value       = aws_wafv2_web_acl.api.arn
}

output "spa_web_acl_arn" {
  description = "ARN of the CloudFront scoped Web ACL that must be attached to the SPA distribution."
  value       = aws_wafv2_web_acl.spa.arn
}

output "cloudfront_distribution_arn" {
  description = "CloudFront distribution ARN expected to be associated with the SPA Web ACL."
  value       = var.cloudfront_distribution_arn
}
