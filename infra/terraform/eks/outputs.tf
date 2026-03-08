output "cluster_name" {
  description = "EKS cluster name."
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "EKS cluster API server endpoint."
  value       = module.eks.cluster_endpoint
}

output "cluster_certificate_authority" {
  description = "Base64 encoded cluster certificate authority data."
  value       = module.eks.cluster_certificate_authority_data
  sensitive   = true
}

output "cluster_oidc_provider_arn" {
  description = "ARN of the IAM OIDC provider associated with the cluster."
  value       = module.eks.oidc_provider_arn
}

output "managed_node_group_role_arns" {
  description = "IAM role ARNs associated with managed node groups."
  value       = module.eks.eks_managed_node_group_iam_role_arns
}

output "cluster_security_group_id" {
  description = "Security group ID for the EKS control plane."
  value       = module.eks.cluster_security_group_id
}

output "cluster_autoscaler_role_arn" {
  description = "IAM role ARN used by the Cluster Autoscaler service account."
  value       = module.iam_irsa_cluster_autoscaler.arn
}

output "aws_load_balancer_controller_role_arn" {
  description = "IAM role ARN used by the AWS Load Balancer Controller service account."
  value       = module.iam_irsa_aws_load_balancer_controller.arn
}

output "external_dns_role_arn" {
  description = "IAM role ARN used by the external-dns service account."
  value       = module.iam_irsa_external_dns.arn
}
