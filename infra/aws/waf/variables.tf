variable "project" {
  description = "Short name used for tagging and resource names."
  type        = string
  default     = "share-house-portal"
}

variable "region" {
  description = "AWS region where regional resources (API Gateway, ALB) are deployed."
  type        = string
  default     = "us-east-1"
}

variable "api_gateway_stage_arns" {
  description = "List of API Gateway stage ARNs to associate with the regional web ACL."
  type        = list(string)
  default     = []
}

variable "alb_arns" {
  description = "List of Application Load Balancer ARNs to associate with the regional web ACL."
  type        = list(string)
  default     = []
}

variable "allowed_origins" {
  description = "Exact Origin header values allowed to reach the application."
  type        = list(string)
  default = [
    "https://app.share-house.example",
    "https://admin.share-house.example",
  ]
}

variable "rate_limit" {
  description = "Number of requests per five-minute period allowed from a single IP before blocking."
  type        = number
  default     = 1200
}

variable "max_body_size_bytes" {
  description = "Maximum payload size in bytes permitted before blocking. Aligns with ingress proxy body size."
  type        = number
  default     = 2097152
}

variable "cloudfront_distribution_arn" {
  description = "ARN of the CloudFront distribution serving the SPA. Used for reference when attaching the CloudFront scoped Web ACL."
  type        = string
  default     = ""
}
