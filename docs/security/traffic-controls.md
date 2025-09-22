# Traffic Controls and Tuning Guide

This document summarises the cross-platform controls that protect the Share House Portal from abusive traffic and describes the process for tuning them safely.

## Allowed Origins

Only the following origins are permitted to interact with the application through the ingress controller, API surfaces, and the CloudFront distribution:

| Purpose | Origin |
| --- | --- |
| Production web application | `https://app.share-house.example` |
| Internal administration UI | `https://admin.share-house.example` |

Requests that include any other `Origin` header value are rejected by both the NGINX ingress configuration (`infra/kubernetes/ingress.yaml`) and the AWS WAF rules (`infra/aws/waf/main.tf`). Requests without an origin header remain allowed so that server-to-server integrations continue to function.

## Rate Limits and Request Size

| Control layer | Limit | Configuration |
| --- | --- | --- |
| NGINX ingress | 10 requests per second and 20 concurrent connections per client IP | `infra/kubernetes/ingress.yaml` and Helm values (`infra/helm/share-house-portal/values.yaml`) |
| AWS WAF (regional and CloudFront) | 1,200 requests per IP over a five minute window | `infra/aws/waf/main.tf` (`rate_limit` variable) |
| Request body size | Maximum 2 MiB | `infra/kubernetes/ingress.yaml` (`proxy-body-size`) and `infra/aws/waf/main.tf` (`max_body_size_bytes`) |

These limits were selected to keep burst traffic low enough to protect upstream services while still supporting legitimate user activity.

## Tuning Process

1. **Observe metrics** – Use the CloudWatch metrics emitted by the WAF (`share-house-portal-*-rate-limit`, `*-allowed-origins`, `*-body-size`) and NGINX ingress logs to determine whether legitimate users are being throttled or blocked.
2. **Engage stakeholders** – Confirm with product and operations teams that adjustments are necessary and understand the expected traffic profile (for example, planned marketing campaigns or API consumers with higher throughput).
3. **Adjust infrastructure code**:
   - For ingress limits or origins, update `infra/helm/share-house-portal/values.yaml` and re-render/redeploy the Helm release.
   - For AWS WAF changes, update the module variables in `infra/aws/waf/variables.tf` or the consuming Terraform workspace and run `terraform apply`.
4. **Document the change** – Record the new limits and rationale in this document (update the tables above) and in operational runbooks.
5. **Verify and monitor** – After deployment, review logs and dashboards to confirm the change behaves as expected. Leave temporary alarms in place to catch regressions.

Always perform tuning in non-production environments first when possible, and ensure limits remain consistent across ingress and WAF layers to avoid inconsistent behaviour.
