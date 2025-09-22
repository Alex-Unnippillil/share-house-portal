terraform {
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

locals {
  project_tag = {
    Project = var.project
  }
}

resource "aws_wafv2_web_acl" "api" {
  name        = "${var.project}-api"
  description = "Regional Web ACL protecting API Gateway stages and ALBs for the Share House Portal APIs."
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project}-api-web-acl"
    sampled_requests_enabled   = true
  }

  rule {
    name     = "AWSManagedCommonRules"
    priority = 0

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project}-api-managed-common"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "RateLimitPerIp"
    priority = 10

    action {
      block {}
    }

    statement {
      rate_based_statement {
        aggregate_key_type = "IP"
        limit              = var.rate_limit
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project}-api-rate-limit"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "EnforceRequestBodySize"
    priority = 20

    action {
      block {}
    }

    statement {
      size_constraint_statement {
        comparison_operator = "GT"
        size                = var.max_body_size_bytes

        field_to_match {
          body {}
        }

        text_transformation {
          priority = 0
          type     = "NONE"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project}-api-body-size"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "EnforceAllowedOrigins"
    priority = 30

    action {
      block {}
    }

    statement {
      and_statement {
        statement {
          size_constraint_statement {
            comparison_operator = "GT"
            size                = 0

            field_to_match {
              single_header {
                name = "origin"
              }
            }

            text_transformation {
              priority = 0
              type     = "NONE"
            }
          }
        }

        statement {
          not_statement {
            statement {
              or_statement {
                dynamic "statement" {
                  for_each = var.allowed_origins

                  content {
                    byte_match_statement {
                      search_string          = statement.value
                      positional_constraint  = "EXACTLY"

                      field_to_match {
                        single_header {
                          name = "origin"
                        }
                      }

                      text_transformation {
                        priority = 0
                        type     = "NONE"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project}-api-allowed-origins"
      sampled_requests_enabled   = true
    }
  }

  tags = local.project_tag
}

resource "aws_wafv2_web_acl_association" "api_gateway" {
  for_each     = { for idx, arn in var.api_gateway_stage_arns : idx => arn if arn != "" }
  resource_arn = each.value
  web_acl_arn  = aws_wafv2_web_acl.api.arn
}

resource "aws_wafv2_web_acl_association" "alb" {
  for_each     = { for idx, arn in var.alb_arns : idx => arn if arn != "" }
  resource_arn = each.value
  web_acl_arn  = aws_wafv2_web_acl.api.arn
}

resource "aws_wafv2_web_acl" "spa" {
  provider    = aws.us_east_1
  name        = "${var.project}-spa"
  description = "CloudFront Web ACL protecting the Share House Portal single page application distribution."
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project}-spa-web-acl"
    sampled_requests_enabled   = true
  }

  rule {
    name     = "AWSManagedCommonRules"
    priority = 0

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project}-spa-managed-common"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "RateLimitPerIp"
    priority = 10

    action {
      block {}
    }

    statement {
      rate_based_statement {
        aggregate_key_type = "IP"
        limit              = var.rate_limit
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project}-spa-rate-limit"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "EnforceAllowedOrigins"
    priority = 20

    action {
      block {}
    }

    statement {
      and_statement {
        statement {
          size_constraint_statement {
            comparison_operator = "GT"
            size                = 0

            field_to_match {
              single_header {
                name = "origin"
              }
            }

            text_transformation {
              priority = 0
              type     = "NONE"
            }
          }
        }

        statement {
          not_statement {
            statement {
              or_statement {
                dynamic "statement" {
                  for_each = var.allowed_origins

                  content {
                    byte_match_statement {
                      search_string         = statement.value
                      positional_constraint = "EXACTLY"

                      field_to_match {
                        single_header {
                          name = "origin"
                        }
                      }

                      text_transformation {
                        priority = 0
                        type     = "NONE"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project}-spa-allowed-origins"
      sampled_requests_enabled   = true
    }
  }

  tags = local.project_tag
}
