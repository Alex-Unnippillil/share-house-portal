locals {
  tags = merge(
    {
      ManagedBy = "terraform"
      Project   = var.project
    },
    var.tags
  )

  node_group_subnet_ids      = length(var.node_group_subnet_ids) > 0 ? var.node_group_subnet_ids : var.subnet_ids
  control_plane_subnet_ids   = length(var.control_plane_subnet_ids) > 0 ? var.control_plane_subnet_ids : var.subnet_ids
  external_dns_txt_owner_id  = coalesce(var.external_dns_txt_owner_id, var.cluster_name)
  additional_policy_map      = { for idx, arn in var.additional_iam_policies : "additional-${idx}" => arn }
  create_lb_controller_ns    = var.aws_load_balancer_controller_namespace != "kube-system"
  create_external_dns_ns     = var.external_dns_namespace != "default"
  create_nginx_ingress_ns    = var.nginx_ingress_namespace != "default"
  create_cert_manager_ns     = var.cert_manager_namespace != "default"
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.13"

  cluster_name    = var.cluster_name
  cluster_version = var.cluster_version

  vpc_id                   = var.vpc_id
  subnet_ids               = var.subnet_ids
  control_plane_subnet_ids = local.control_plane_subnet_ids

  cluster_endpoint_private_access = var.cluster_endpoint_private_access
  cluster_endpoint_public_access  = var.cluster_endpoint_public_access
  cluster_public_access_cidrs     = var.cluster_public_access_cidrs

  cluster_additional_security_group_ids = var.cluster_additional_security_group_ids

  enable_irsa = true

  cluster_addons = var.cluster_addons

  cluster_tags = local.tags
  tags         = local.tags

  eks_managed_node_group_defaults = {
    ami_type  = "AL2023_x86_64_STANDARD"
    disk_size = var.node_group_disk_size
    subnet_ids = local.node_group_subnet_ids
    tags      = local.tags
  }

  eks_managed_node_groups = {
    for name, config in var.eks_managed_node_groups :
    name => {
      min_size       = config.min_size
      max_size       = config.max_size
      desired_size   = config.desired_size
      instance_types = config.instance_types
      capacity_type  = config.capacity_type
      labels         = try(config.labels, {})
      taints         = try(config.taints, [])
      tags           = local.tags
    }
  }
}

data "aws_eks_cluster" "this" {
  name = module.eks.cluster_name
}

data "aws_eks_cluster_auth" "this" {
  name = module.eks.cluster_name
}

provider "kubernetes" {
  host                   = data.aws_eks_cluster.this.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.this.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.this.token
}

provider "helm" {
  kubernetes {
    host                   = data.aws_eks_cluster.this.endpoint
    cluster_ca_certificate = base64decode(data.aws_eks_cluster.this.certificate_authority[0].data)
    token                  = data.aws_eks_cluster_auth.this.token
  }
}

module "iam_irsa_cluster_autoscaler" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts"
  version = "~> 5.38"

  name = "${var.cluster_name}-cluster-autoscaler"

  attach_cluster_autoscaler_policy = true
  cluster_autoscaler_cluster_names = [module.eks.cluster_name]

  oidc_providers = {
    this = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = [
        "${var.cluster_autoscaler_namespace}:${var.cluster_autoscaler_service_account_name}"
      ]
    }
  }

  policies = local.additional_policy_map
  tags     = local.tags
}

module "iam_irsa_aws_load_balancer_controller" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts"
  version = "~> 5.38"

  name = "${var.cluster_name}-aws-load-balancer-controller"

  attach_load_balancer_controller_policy                    = true
  load_balancer_controller_targetgroup_arns                 = var.load_balancer_controller_target_group_arns

  oidc_providers = {
    this = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = [
        "${var.aws_load_balancer_controller_namespace}:${var.aws_load_balancer_controller_service_account_name}"
      ]
    }
  }

  policies = local.additional_policy_map
  tags     = local.tags
}

module "iam_irsa_external_dns" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts"
  version = "~> 5.38"

  name = "${var.cluster_name}-external-dns"

  attach_external_dns_policy = true
  external_dns_hosted_zone_arns = var.external_dns_hosted_zone_arns

  oidc_providers = {
    this = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = [
        "${var.external_dns_namespace}:${var.external_dns_service_account_name}"
      ]
    }
  }

  policies = local.additional_policy_map
  tags     = local.tags
}

resource "helm_release" "cluster_autoscaler" {
  name       = "cluster-autoscaler"
  repository = "https://kubernetes.github.io/autoscaler"
  chart      = "cluster-autoscaler"
  version    = var.cluster_autoscaler_chart_version
  namespace  = var.cluster_autoscaler_namespace

  timeout          = 600
  cleanup_on_fail  = true
  atomic           = true

  values = [
    yamlencode({
      autoDiscovery = {
        clusterName = module.eks.cluster_name
      }
      awsRegion = var.region
      extraArgs = {
        "balance-similar-node-groups"   = "true"
        "skip-nodes-with-local-storage" = "false"
        "skip-nodes-with-system-pods"   = "false"
      }
      rbac = {
        serviceAccount = {
          create = true
          name   = var.cluster_autoscaler_service_account_name
          annotations = {
            "eks.amazonaws.com/role-arn" = module.iam_irsa_cluster_autoscaler.arn
          }
        }
      }
    })
  ]

  depends_on = [
    module.eks,
    module.iam_irsa_cluster_autoscaler
  ]
}

resource "helm_release" "aws_load_balancer_controller" {
  name             = "aws-load-balancer-controller"
  repository       = "https://aws.github.io/eks-charts"
  chart            = "aws-load-balancer-controller"
  version          = var.aws_load_balancer_controller_chart_version
  namespace        = var.aws_load_balancer_controller_namespace
  create_namespace = local.create_lb_controller_ns

  timeout         = 600
  cleanup_on_fail = true
  atomic          = true

  values = [
    yamlencode({
      clusterName = module.eks.cluster_name
      region      = var.region
      vpcId       = var.vpc_id
      serviceAccount = {
        create = true
        name   = var.aws_load_balancer_controller_service_account_name
        annotations = {
          "eks.amazonaws.com/role-arn" = module.iam_irsa_aws_load_balancer_controller.arn
        }
      }
    })
  ]

  depends_on = [
    module.eks,
    module.iam_irsa_aws_load_balancer_controller
  ]
}

resource "helm_release" "nginx_ingress" {
  name             = "ingress-nginx"
  repository       = "https://kubernetes.github.io/ingress-nginx"
  chart            = "ingress-nginx"
  version          = var.nginx_ingress_chart_version
  namespace        = var.nginx_ingress_namespace
  create_namespace = local.create_nginx_ingress_ns

  timeout         = 600
  cleanup_on_fail = true
  atomic          = true

  values = [
    yamlencode({
      controller = {
        publishService = {
          enabled = true
        }
        service = {
          type = "LoadBalancer"
          annotations = {
            "service.beta.kubernetes.io/aws-load-balancer-type"   = "nlb"
            "service.beta.kubernetes.io/aws-load-balancer-scheme" = "internet-facing"
          }
        }
      }
    })
  ]

  depends_on = [
    module.eks,
    helm_release.aws_load_balancer_controller
  ]
}

resource "helm_release" "cert_manager" {
  name             = "cert-manager"
  repository       = "https://charts.jetstack.io"
  chart            = "cert-manager"
  version          = var.cert_manager_chart_version
  namespace        = var.cert_manager_namespace
  create_namespace = local.create_cert_manager_ns

  timeout         = 600
  cleanup_on_fail = true
  atomic          = true

  set {
    name  = "installCRDs"
    value = "true"
  }

  depends_on = [
    module.eks
  ]
}

resource "helm_release" "external_dns" {
  name             = "external-dns"
  repository       = "https://kubernetes-sigs.github.io/external-dns/"
  chart            = "external-dns"
  version          = var.external_dns_chart_version
  namespace        = var.external_dns_namespace
  create_namespace = local.create_external_dns_ns

  timeout         = 600
  cleanup_on_fail = true
  atomic          = true

  values = [
    yamlencode({
      provider = "aws"
      policy   = "sync"
      txtOwnerId = local.external_dns_txt_owner_id
      domainFilters = var.external_dns_domain_filters
      zoneType      = var.external_dns_zone_type
      sources       = ["service", "ingress"]
      serviceAccount = {
        create = true
        name   = var.external_dns_service_account_name
        annotations = {
          "eks.amazonaws.com/role-arn" = module.iam_irsa_external_dns.arn
        }
      }
    })
  ]

  depends_on = [
    module.eks,
    module.iam_irsa_external_dns,
    helm_release.aws_load_balancer_controller
  ]
}
