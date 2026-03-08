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
  region = var.region
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

variable "project" {
  description = "Project name used for tagging resources."
  type        = string
}

variable "environment" {
  description = "Deployment environment (e.g. dev, staging, prod)."
  type        = string
}

variable "region" {
  description = "AWS region for region-specific resources."
  type        = string
}

variable "root_domain" {
  description = "Root domain name that will host the application."
  type        = string
}

variable "spa_subdomain" {
  description = "Subdomain used for the SPA front-end."
  type        = string
  default     = "app"
}

variable "www_subdomain" {
  description = "Marketing alias that should map to the SPA."
  type        = string
  default     = "www"
}

variable "api_subdomain" {
  description = "Subdomain that should resolve to the API origin."
  type        = string
  default     = "api"
}

variable "media_subdomain" {
  description = "Subdomain that should resolve to the media CDN."
  type        = string
  default     = "media"
}

variable "tags" {
  description = "Additional resource tags."
  type        = map(string)
  default     = {}
}

variable "spa_bucket_name" {
  description = "Name of the S3 bucket containing the compiled SPA assets."
  type        = string
}

variable "media_bucket_name" {
  description = "Name of the S3 bucket that stores uploaded media assets."
  type        = string
}

variable "api_origin_domain_name" {
  description = "Origin domain name that will receive API traffic (e.g. API Gateway, load balancer)."
  type        = string
}

variable "api_origin_protocol_policy" {
  description = "Protocol policy for connecting CloudFront to the API origin."
  type        = string
  default     = "https-only"
  validation {
    condition     = contains(["https-only", "match-viewer"], var.api_origin_protocol_policy)
    error_message = "api_origin_protocol_policy must be either https-only or match-viewer."
  }
}

variable "api_origin_port" {
  description = "Port CloudFront should use when connecting to the API origin."
  type        = number
  default     = 443
}

variable "api_origin_path" {
  description = "Optional origin path prefix for API requests (e.g. /prod)."
  type        = string
  default     = ""
}

variable "api_hosted_zone_id" {
  description = "Hosted zone ID of the API origin (required for Route53 alias)."
  type        = string
}

variable "enable_api_ipv6" {
  description = "Set to true if the API origin supports IPv6 and should receive an AAAA alias record."
  type        = bool
  default     = false
}

variable "access_logs_bucket" {
  description = "Optional bucket domain (e.g. bucket.s3.amazonaws.com) that receives CloudFront logs."
  type        = string
  default     = ""
}

variable "spa_logging_prefix" {
  description = "Prefix to use when writing SPA distribution access logs."
  type        = string
  default     = "cloudfront/spa/"
}

variable "media_logging_prefix" {
  description = "Prefix to use when writing media distribution access logs."
  type        = string
  default     = "cloudfront/media/"
}

locals {
  base_tags = merge({
    Project     = var.project,
    Environment = var.environment,
    ManagedBy   = "terraform"
  }, var.tags)

  web_domain   = "${var.spa_subdomain}.${var.root_domain}"
  www_domain   = "${var.www_subdomain}.${var.root_domain}"
  api_domain   = "${var.api_subdomain}.${var.root_domain}"
  media_domain = "${var.media_subdomain}.${var.root_domain}"

  certificate_domains = distinct([
    var.root_domain,
    local.web_domain,
    local.www_domain,
    local.api_domain,
    local.media_domain
  ])
}

data "aws_s3_bucket" "spa" {
  bucket = var.spa_bucket_name
}

data "aws_s3_bucket" "media" {
  bucket = var.media_bucket_name
}

# ---------------------------------------------------------------------------
# Route 53 Hosted Zone
# ---------------------------------------------------------------------------
resource "aws_route53_zone" "primary" {
  name          = var.root_domain
  comment       = "${var.project} ${var.environment} public hosted zone"
  force_destroy = false

  tags = local.base_tags
}

# ---------------------------------------------------------------------------
# ACM Certificate (us-east-1) for CloudFront Distributions
# ---------------------------------------------------------------------------
resource "aws_acm_certificate" "edge" {
  provider = aws.us_east_1

  domain_name               = local.web_domain
  subject_alternative_names = [for domain in local.certificate_domains : domain if domain != local.web_domain]
  validation_method         = "DNS"

  options {
    certificate_transparency_logging_preference = "ENABLED"
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = local.base_tags
}

resource "aws_route53_record" "edge_certificate_validation" {
  for_each = {
    for option in aws_acm_certificate.edge.domain_validation_options : option.domain_name => {
      name   = option.resource_record_name
      type   = option.resource_record_type
      record = option.resource_record_value
    }
  }

  zone_id = aws_route53_zone.primary.zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 60
  records = [each.value.record]
}

resource "aws_acm_certificate_validation" "edge" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.edge.arn
  validation_record_fqdns = [for record in aws_route53_record.edge_certificate_validation : record.fqdn]
}

# ---------------------------------------------------------------------------
# Shared CloudFront data sources
# ---------------------------------------------------------------------------
data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_origin_request_policy" "all_viewer" {
  name = "Managed-AllViewer"
}

data "aws_cloudfront_origin_request_policy" "api_gateway" {
  name = "Managed-CORS-CustomOrigin"
}

data "aws_cloudfront_response_headers_policy" "security_headers" {
  name = "Managed-SecurityHeadersPolicy"
}

# ---------------------------------------------------------------------------
# SPA Distribution
# ---------------------------------------------------------------------------
resource "aws_cloudfront_origin_access_control" "spa" {
  name                              = "${var.project}-${var.environment}-spa-oac"
  description                       = "Origin access control for SPA bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "spa" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.project} ${var.environment} SPA distribution"
  default_root_object = "index.html"

  aliases = [var.root_domain, local.web_domain, local.www_domain]

  origin {
    origin_id   = "spa-bucket"
    domain_name = data.aws_s3_bucket.spa.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.spa.id
  }

  origin {
    origin_id   = "api-origin"
    domain_name = var.api_origin_domain_name
    origin_path = var.api_origin_path

    custom_origin_config {
      http_port              = var.api_origin_port
      https_port             = var.api_origin_port
      origin_protocol_policy = var.api_origin_protocol_policy
      origin_ssl_protocols   = ["TLSv1.2", "TLSv1.1"]
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "spa-bucket"

    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    cache_policy_id            = data.aws_cloudfront_cache_policy.caching_optimized.id
    origin_request_policy_id   = data.aws_cloudfront_origin_request_policy.all_viewer.id
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.security_headers.id
  }

  ordered_cache_behavior {
    path_pattern     = "api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "api-origin"

    viewer_protocol_policy = "https-only"
    compress               = true

    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.api_gateway.id
  }

  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn            = aws_acm_certificate_validation.edge.certificate_arn
    ssl_support_method             = "sni-only"
    minimum_protocol_version       = "TLSv1.2_2021"
    cloudfront_default_certificate = false
  }

  dynamic "logging_config" {
    for_each = var.access_logs_bucket == "" ? [] : [1]

    content {
      include_cookies = false
      bucket          = var.access_logs_bucket
      prefix          = var.spa_logging_prefix
    }
  }

  tags = local.base_tags

  depends_on = [aws_acm_certificate_validation.edge]
}

resource "aws_route53_record" "spa_alias_ipv4" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = local.web_domain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.spa.domain_name
    zone_id                = aws_cloudfront_distribution.spa.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "spa_alias_ipv6" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = local.web_domain
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.spa.domain_name
    zone_id                = aws_cloudfront_distribution.spa.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www_alias_ipv4" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = local.www_domain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.spa.domain_name
    zone_id                = aws_cloudfront_distribution.spa.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www_alias_ipv6" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = local.www_domain
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.spa.domain_name
    zone_id                = aws_cloudfront_distribution.spa.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "root_alias_ipv4" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = var.root_domain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.spa.domain_name
    zone_id                = aws_cloudfront_distribution.spa.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "root_alias_ipv6" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = var.root_domain
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.spa.domain_name
    zone_id                = aws_cloudfront_distribution.spa.hosted_zone_id
    evaluate_target_health = false
  }
}

# ---------------------------------------------------------------------------
# Media Distribution
# ---------------------------------------------------------------------------
resource "aws_cloudfront_origin_access_control" "media" {
  name                              = "${var.project}-${var.environment}-media-oac"
  description                       = "Origin access control for media bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "media" {
  enabled         = true
  is_ipv6_enabled = true
  comment         = "${var.project} ${var.environment} media distribution"

  aliases = [local.media_domain]

  origin {
    origin_id   = "media-bucket"
    domain_name = data.aws_s3_bucket.media.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.media.id
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "media-bucket"

    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    cache_policy_id            = data.aws_cloudfront_cache_policy.caching_optimized.id
    origin_request_policy_id   = data.aws_cloudfront_origin_request_policy.all_viewer.id
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.security_headers.id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn            = aws_acm_certificate_validation.edge.certificate_arn
    ssl_support_method             = "sni-only"
    minimum_protocol_version       = "TLSv1.2_2021"
    cloudfront_default_certificate = false
  }

  dynamic "logging_config" {
    for_each = var.access_logs_bucket == "" ? [] : [1]

    content {
      include_cookies = false
      bucket          = var.access_logs_bucket
      prefix          = var.media_logging_prefix
    }
  }

  tags = local.base_tags

  depends_on = [aws_acm_certificate_validation.edge]
}

resource "aws_route53_record" "media_alias_ipv4" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = local.media_domain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.media.domain_name
    zone_id                = aws_cloudfront_distribution.media.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "media_alias_ipv6" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = local.media_domain
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.media.domain_name
    zone_id                = aws_cloudfront_distribution.media.hosted_zone_id
    evaluate_target_health = false
  }
}

# ---------------------------------------------------------------------------
# API DNS records (forwarded to external origin)
# ---------------------------------------------------------------------------
resource "aws_route53_record" "api_alias_ipv4" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = local.api_domain
  type    = "A"

  alias {
    name                   = var.api_origin_domain_name
    zone_id                = var.api_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "api_alias_ipv6" {
  count   = var.enable_api_ipv6 ? 1 : 0
  zone_id = aws_route53_zone.primary.zone_id
  name    = local.api_domain
  type    = "AAAA"

  alias {
    name                   = var.api_origin_domain_name
    zone_id                = var.api_hosted_zone_id
    evaluate_target_health = false
  }
}
