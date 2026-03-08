output "organization_id" {
  description = "AWS Organization ID."
  value       = module.aws_org.organization_id
}

output "account_ids" {
  description = "Map of managed account IDs."
  value       = module.aws_org.account_ids
}

output "organizational_units" {
  description = "Organizational unit identifiers."
  value       = module.aws_org.organizational_units
}

output "scp_policy_ids" {
  description = "Guardrail service control policy IDs."
  value       = module.aws_org.scp_policy_ids
}

output "identity_center_permission_set_arn" {
  description = "IAM Identity Center administrator permission set ARN (if configured)."
  value       = module.aws_org.identity_center_permission_set_arn
}

output "cost_allocation_tags" {
  description = "Activated cost allocation tag keys."
  value       = module.aws_org.cost_allocation_tags
}
