# Networking Terraform Module

This Terraform configuration provisions per-environment networking primitives in AWS. Each environment receives its own VPC spanning three availability zones with public and private subnets, NAT gateways, security groups for applications and databases, and VPC endpoints for frequently used services.

## Features

- One VPC per environment with DNS support enabled.
- Three public subnets (one per availability zone) for ingress resources such as load balancers and NAT gateways.
- Three private subnets (one per availability zone) for application and database workloads.
- Internet gateway, elastic IPs, and per-AZ NAT gateways for outbound access from private subnets.
- Opinionated security groups that expose HTTP/HTTPS for applications and limit database access to application instances.
- Gateway VPC endpoints for Amazon S3 and DynamoDB plus interface endpoints for Amazon ECR (`ecr.api` and `ecr.dkr`).

## CIDR Strategy

Provide a parent CIDR block for each environment (for example, `10.10.0.0/20`). When explicit subnet CIDRs are not supplied, the module automatically creates:

- **Public subnets:** the first three `cidrsubnet` slices of the VPC CIDR using `newbits = 4` (e.g., `10.10.0.0/24`, `10.10.1.0/24`, `10.10.2.0/24`).
- **Private subnets:** the next three slices using the same `newbits = 4` calculation (e.g., `10.10.3.0/24`, `10.10.4.0/24`, `10.10.5.0/24`).

This layout keeps public and private ranges contiguous while leaving space in the VPC for future subnet tiers. If you need different addressing, provide `public_subnet_cidrs` and `private_subnet_cidrs` lists that align with the availability zones specified via `var.azs`.

## Usage

```hcl
module "networking" {
  source = "./infra/terraform/networking"

  azs = [
    "us-east-1a",
    "us-east-1b",
    "us-east-1c",
  ]

  environments = {
    dev = {
      cidr_block = "10.10.0.0/20"
    }

    staging = {
      cidr_block = "10.20.0.0/20"
      tags = {
        Owner = "platform-team"
      }
    }

    prod = {
      cidr_block = "10.30.0.0/20"
    }
  }

  common_tags = {
    Project = "share-house"
  }
}
```

## Outputs

- `vpc_ids` – map of environment names to VPC IDs.
- `public_subnet_ids` – map of `<env>-<az index>` to public subnet IDs.
- `private_subnet_ids` – map of `<env>-<az index>` to private subnet IDs.
- `security_groups` – nested map with application, database, and VPC endpoint security group IDs per environment.

## Notes

- NAT gateways incur hourly and data processing charges in each availability zone.
- The database security group opens PostgreSQL (5432) to the application security group; adjust as needed for other database engines.
- Interface VPC endpoints require associated private subnets to have available IP address capacity.
