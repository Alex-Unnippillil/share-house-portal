variable "region" {
  description = "AWS region to deploy the EKS cluster into."
  type        = string
}

variable "aws_profile" {
  description = "Optional named AWS CLI profile to use for authentication."
  type        = string
  default     = null
}

variable "project" {
  description = "Project tag applied to AWS resources."
  type        = string
  default     = "share-house-portal"
}

variable "cluster_name" {
  description = "Name of the EKS cluster."
  type        = string
}

variable "cluster_version" {
  description = "Desired Kubernetes version for the EKS control plane."
  type        = string
  default     = "1.29"
}

variable "vpc_id" {
  description = "ID of the VPC that hosts the EKS cluster."
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs where worker nodes will be launched."
  type        = list(string)
}

variable "control_plane_subnet_ids" {
  description = "Optional list of subnet IDs dedicated to the control plane ENIs. Defaults to \"subnet_ids\" when empty."
  type        = list(string)
  default     = []
}

variable "cluster_endpoint_private_access" {
  description = "Whether the EKS cluster endpoint is private."
  type        = bool
  default     = true
}

variable "cluster_endpoint_public_access" {
  description = "Whether the EKS cluster endpoint is public."
  type        = bool
  default     = false
}

variable "cluster_public_access_cidrs" {
  description = "List of CIDR blocks that can access the public endpoint when enabled."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "cluster_additional_security_group_ids" {
  description = "Additional security group IDs attached to the cluster."
  type        = list(string)
  default     = []
}

variable "node_group_disk_size" {
  description = "EBS volume size in GiB for the default managed node groups."
  type        = number
  default     = 50
}

variable "node_group_subnet_ids" {
  description = "Override subnet IDs used by managed node groups. Defaults to \"subnet_ids\" when empty."
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Additional tags applied to AWS resources."
  type        = map(string)
  default     = {}
}

variable "eks_managed_node_groups" {
  description = "Map of EKS managed node group configurations keyed by node group name."
  type = map(object({
    min_size       = number
    max_size       = number
    desired_size   = number
    instance_types = list(string)
    capacity_type  = optional(string, "ON_DEMAND")
    labels         = optional(map(string), {})
    taints = optional(list(object({
      key    = string
      value  = string
      effect = string
    })), [])
  }))
  default = {
    default = {
      min_size       = 1
      max_size       = 3
      desired_size   = 1
      instance_types = ["t3.medium"]
      capacity_type  = "ON_DEMAND"
      labels = {
        role = "default"
      }
      taints = []
    }
  }
}

variable "cluster_addons" {
  description = "Managed EKS cluster add-ons configuration map."
  type = map(object({
    addon_version            = optional(string)
    configuration_values     = optional(string)
    most_recent              = optional(bool)
    resolve_conflicts        = optional(string)
    service_account_role_arn = optional(string)
    marketplace_customer_config = optional(object({
      product_id  = string
      product_code = string
    }))
  }))
  default = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
      configuration_values = jsonencode({
        env = {
          ENABLE_PREFIX_DELEGATION = "true"
        }
      })
    }
  }
}

variable "cluster_autoscaler_namespace" {
  description = "Namespace where the Cluster Autoscaler chart is installed."
  type        = string
  default     = "kube-system"
}

variable "cluster_autoscaler_service_account_name" {
  description = "Service account name used by the Cluster Autoscaler release."
  type        = string
  default     = "cluster-autoscaler"
}

variable "cluster_autoscaler_chart_version" {
  description = "Version of the Cluster Autoscaler Helm chart."
  type        = string
  default     = "9.34.1"
}

variable "aws_load_balancer_controller_namespace" {
  description = "Namespace where the AWS Load Balancer Controller chart is installed."
  type        = string
  default     = "kube-system"
}

variable "aws_load_balancer_controller_service_account_name" {
  description = "Service account name for the AWS Load Balancer Controller."
  type        = string
  default     = "aws-load-balancer-controller"
}

variable "aws_load_balancer_controller_chart_version" {
  description = "Version of the AWS Load Balancer Controller Helm chart."
  type        = string
  default     = "1.7.2"
}

variable "nginx_ingress_namespace" {
  description = "Namespace where the ingress-nginx chart is installed."
  type        = string
  default     = "ingress-nginx"
}

variable "nginx_ingress_chart_version" {
  description = "Version of the ingress-nginx Helm chart."
  type        = string
  default     = "4.10.0"
}

variable "cert_manager_namespace" {
  description = "Namespace where the cert-manager chart is installed."
  type        = string
  default     = "cert-manager"
}

variable "cert_manager_chart_version" {
  description = "Version of the cert-manager Helm chart."
  type        = string
  default     = "1.14.4"
}

variable "external_dns_namespace" {
  description = "Namespace where the external-dns chart is installed."
  type        = string
  default     = "external-dns"
}

variable "external_dns_service_account_name" {
  description = "Service account name for the external-dns release."
  type        = string
  default     = "external-dns"
}

variable "external_dns_chart_version" {
  description = "Version of the external-dns Helm chart."
  type        = string
  default     = "1.14.5"
}

variable "external_dns_txt_owner_id" {
  description = "TXT record owner identifier used by external-dns. Defaults to the cluster name when null."
  type        = string
  default     = null
}

variable "external_dns_domain_filters" {
  description = "Optional list of domain filters for external-dns."
  type        = list(string)
  default     = []
}

variable "external_dns_zone_type" {
  description = "Route53 zone type managed by external-dns (public or private)."
  type        = string
  default     = "public"
}

variable "external_dns_hosted_zone_arns" {
  description = "Route53 hosted zone ARNs that external-dns is allowed to manage."
  type        = list(string)
  default     = []
}

variable "load_balancer_controller_target_group_arns" {
  description = "Restrict the load balancer controller to specific target group ARNs when supplied."
  type        = list(string)
  default     = []
}

variable "additional_iam_policies" {
  description = "Additional IAM policy ARNs to attach to all service account roles."
  type        = list(string)
  default     = []
}
