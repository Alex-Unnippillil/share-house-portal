# AWS WAF Configuration

This Terraform configuration provisions two AWS WAFv2 Web ACLs:

1. A **regional** Web ACL that attaches to Amazon API Gateway stages and Application Load Balancers backing the Share House Portal APIs.
2. A **CloudFront** scoped Web ACL used by the single page application (SPA) distribution.

Both ACLs implement the same hardening primitives:

- AWS managed `AWSManagedRulesCommonRuleSet` baseline protections.
- A shared IP based rate limit (defaults to 1,200 requests per IP per five minute period).
- Inspection of the `Origin` header to enforce the approved domain allow list.
- A request body size ceiling (2 MiB) matching the NGINX ingress proxy body size limit.

## Usage

1. Provide the relevant resource ARNs as variables (API Gateway stage ARNs, ALB ARNs, and optionally the CloudFront distribution ARN) in a Terraform workspace.
2. Run `terraform init` and `terraform apply` inside `infra/aws/waf`.

Example variable definition:

```hcl
module "waf" {
  source = "./infra/aws/waf"

  project                 = "share-house-portal"
  region                  = "us-east-1"
  api_gateway_stage_arns  = ["arn:aws:apigateway:us-east-1::/restapis/abc123/stages/prod"]
  alb_arns                = ["arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/share-house/50dc6c495c0c9188"]
  allowed_origins         = ["https://app.share-house.example", "https://admin.share-house.example"]
  rate_limit              = 1200
  max_body_size_bytes     = 2097152
}
```

The CloudFront scoped ACL must be deployed from `us-east-1`, which is handled via the provider alias defined in `main.tf`.

## Associating the CloudFront Web ACL

Terraform cannot directly associate a Web ACL to an existing CloudFront distribution without managing the entire distribution resource. After `terraform apply`, attach the ACL by setting the distribution's `web_acl_id` to the output `spa_web_acl_arn`. This can be accomplished with the AWS CLI:

```bash
aws cloudfront update-distribution \
  --id YOUR_DISTRIBUTION_ID \
  --if-match E2ABCDEFGHIJKL \
  --distribution-config file://distribution-config.json \
  --web-acl-id $(terraform output -raw spa_web_acl_arn)
```

Alternatively, update the CloudFront distribution via infrastructure-as-code so that `web_acl_id` references the Terraform output.

## Monitoring and Tuning

All rules emit CloudWatch metrics whose names include the project slug (for example `share-house-portal-api-rate-limit`). Use these metrics in dashboards and alarms to observe rate limiting or origin blocks, and adjust the module variables as documented in `docs/security/traffic-controls.md`.
