# Kubernetes Platform Bootstrap

This directory documents how to provision and bootstrap the Share House Portal Kubernetes platform on Amazon EKS using the Terraform configuration contained in [`../terraform/eks`](../terraform/eks).

## Prerequisites

Before applying the infrastructure configuration ensure that the following tools and requirements are met:

- Terraform v1.4.0 or newer
- AWS CLI v2 with credentials that can provision IAM, VPC, EKS, Route53 and related resources
- kubectl v1.29+ (matches the target cluster version)
- (Optional) A remote Terraform backend such as S3 + DynamoDB for state locking
- Access to an existing VPC with private subnets for worker nodes and the ability to create the necessary security groups and load balancers

## Repository Layout

```
infra/
├── kubernetes/          # Platform documentation (this file)
└── terraform/
    └── eks/             # Terraform modules, providers and Helm releases for the EKS stack
```

## Bootstrap Workflow

1. **Copy and edit variable definitions.**
   ```bash
   cd infra/terraform/eks
   cp terraform.tfvars.example terraform.tfvars
   ```
   Update `terraform.tfvars` with the IDs of the target VPC and subnets, the desired cluster name, and hosted zone ARNs for services such as `external-dns`. Every value in `terraform.tfvars.example` includes inline comments to guide the selection of appropriate IDs and sizing.

2. **Configure Terraform backend (optional).** If you plan to share state between team members, add a `backend` block to `versions.tf` or create a `backend.hcl` file that points at your remote S3 bucket/DynamoDB table before running `terraform init`.

3. **Initialise Terraform providers and modules.**
   ```bash
   terraform init
   ```
   This downloads the AWS, Kubernetes and Helm providers, the `terraform-aws-modules/eks` module, and the IAM sub-modules required for IRSA roles.

4. **Review the plan.**
   ```bash
   terraform plan
   ```
   Verify the proposed cluster name, node group sizing, IAM roles, and Helm releases before applying changes.

5. **Apply the infrastructure.**
   ```bash
   terraform apply
   ```
   The apply step creates the EKS cluster, managed node groups, IAM OIDC provider, and attaches IAM roles for service accounts. Once the control plane is available, Terraform automatically deploys the following Helm charts through the Helm provider:

   - Cluster Autoscaler (auto-discovers node groups)
   - AWS Load Balancer Controller (required for ALB/NLB integrations)
   - ingress-nginx (exposes NGINX via an AWS load balancer)
   - cert-manager (installs CRDs and controller)
   - external-dns (manages Route53 records)

6. **Update kubeconfig for interactive access.**
   ```bash
   aws eks update-kubeconfig --name <your-cluster-name> --region <aws-region>
   kubectl get nodes
   ```
   Confirm nodes are ready and the Helm releases are installed: `kubectl get pods -A`.

## Configuration Overrides

The Terraform module exposes variables for tailoring the deployment without modifying `main.tf`:

- **Cluster and networking**
  - `cluster_endpoint_public_access`, `cluster_endpoint_private_access`, and `cluster_public_access_cidrs` toggle API server connectivity.
  - `cluster_additional_security_group_ids` allows you to attach pre-existing security groups to the control plane.
  - `eks_managed_node_groups` accepts a map of node group definitions. Each entry can set capacity type (`ON_DEMAND`/`SPOT`), labels, and taints. See `terraform.tfvars.example` for multiple pools (e.g., default + spot).

- **Managed add-ons**
  - Override the default `cluster_addons` map to pin specific versions of `coredns`, `kube-proxy`, or `vpc-cni`, or to inject custom JSON configuration (for example enabling prefix delegation).

- **Helm chart versions and namespaces**
  - Variables like `cluster_autoscaler_chart_version`, `nginx_ingress_namespace`, `cert_manager_chart_version`, and `external_dns_namespace` allow you to upgrade charts or install them into alternative namespaces.
  - Set `external_dns_domain_filters`, `external_dns_txt_owner_id`, and `external_dns_hosted_zone_arns` to limit which Route53 zones are modified.
  - `aws_load_balancer_controller_namespace` and `aws_load_balancer_controller_service_account_name` can be changed if you prefer to co-locate the controller outside `kube-system`.

- **IAM permissions**
  - `additional_iam_policies` attaches extra managed policy ARNs to every IRSA role (useful for organisation-wide logging or secret access requirements).
  - `load_balancer_controller_target_group_arns` scopes the load balancer controller permissions to specific target groups if your AWS account enforces least privilege.

- **Ingress behaviour**
  - The default ingress-nginx chart values expose an internet-facing Network Load Balancer. Adjust or extend the `values` map inside `helm_release.nginx_ingress` if you need an internal load balancer, custom SSL policies, or AWS WAF integration.

If you need to supply more Helm overrides than the provided variables expose, extend the existing `values = [yamlencode({...})]` blocks in `infra/terraform/eks/main.tf` or split them into local variables that read from additional `tfvars` entries. Terraform will automatically reconcile the release with your new settings.

## Post-Provisioning Tasks

- **Certificate Issuers:** Create `ClusterIssuer` or `Issuer` resources for cert-manager (ACME, Route53 DNS01, etc.). If you use Route53 DNS01 challenges, reuse the `external_dns_hosted_zone_arns` and add the same ARNs to a new IAM role created via the IRSA module for cert-manager.
- **Ingress Definitions:** Deploy application-specific `Ingress` resources that reference either the ingress-nginx controller (`kubernetes.io/ingress.class: nginx`) or the AWS Load Balancer Controller (`ingressClassName: alb`).
- **Autoscaling Policies:** Fine-tune node group scaling behaviour (`desired_size`, `max_size`) to reflect workload demand, and optionally add `autoscaling_group_tags` by extending the node group configuration map.

## Cleaning Up

Run `terraform destroy` from `infra/terraform/eks` to remove the entire stack. Be aware that dangling load balancers, security groups, or Route53 records created outside Terraform must be deleted manually before destruction can complete.
