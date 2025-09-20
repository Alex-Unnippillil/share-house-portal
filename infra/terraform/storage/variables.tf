variable "bucket_prefix" {
  description = "Prefix applied to all storage buckets (e.g. organisation or application name)."
  type        = string
  default     = "share-house-portal"
}

variable "environment" {
  description = "Deployment environment identifier used as part of the bucket name (e.g. dev, staging, prod)."
  type        = string
  default     = "dev"
}

variable "documents_bucket_allowed_principals" {
  description = "IAM principals (roles, users, or accounts) that require read/write access to the documents bucket."
  type        = list(string)
  default     = []
}

variable "images_bucket_allowed_principals" {
  description = "IAM principals permitted to manage listing and marketing imagery."
  type        = list(string)
  default     = []
}

variable "exports_bucket_allowed_principals" {
  description = "IAM principals permitted to write analytics exports and retrieve generated files."
  type        = list(string)
  default     = []
}

variable "artifacts_bucket_allowed_principals" {
  description = "IAM principals (generally CI/CD roles) permitted to store and fetch build artifacts."
  type        = list(string)
  default     = []
}

variable "backups_bucket_allowed_principals" {
  description = "IAM principals (backup automation, disaster recovery tooling) permitted to write or read immutable backups."
  type        = list(string)
  default     = []
}
