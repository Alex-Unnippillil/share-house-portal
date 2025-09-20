variable "aws_region" {
  description = "AWS region to deploy messaging resources in."
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment identifier used to namespace resources."
  type        = string
  default     = "dev"
}

variable "tags" {
  description = "Additional tags to apply to all resources."
  type        = map(string)
  default     = {}
}
