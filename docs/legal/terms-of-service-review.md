# Terms of Service Review Log

This log tracks policy-owner and legal-review coordination for `app/terms/page.mdx` before production deployments.

## Current published candidate

- **Document:** `app/terms/page.mdx`
- **Version tag:** `tos-v2026-02-19`
- **Last updated in content:** February 19, 2026
- **Required approvers before production deploy:**
  - Policy owner (Product)
  - Compliance/Legal reviewer
  - Support operations owner
  - Engineering release owner

## Pre-deploy sign-off checklist

Mark each item complete before merging a production-bound release branch:

- [ ] Policy owner approved legal language and workflow alignment.
- [ ] Legal/compliance reviewer approved governing-law, liability, and notice clauses.
- [ ] Support operations owner confirmed contact pathways match in-product support (`/contact`) and property-manager escalation flows.
- [ ] Engineering release owner confirmed `pnpm check:legal-content` passes in CI.
- [ ] Version tag updated if substantive legal text changed.

## Change log

| Date | Version tag | Summary | Owner |
| --- | --- | --- | --- |
| 2026-02-19 | `tos-v2026-02-19` | Replaced placeholder governing law and legal notice email; aligned support + escalation language with product workflows. | Product + Engineering |
