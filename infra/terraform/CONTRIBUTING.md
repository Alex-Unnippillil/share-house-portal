# Terraform Contributor Guide

This directory contains the infrastructure as code configuration for the Share House Portal. The goal of this guide is to help you ship changes safely by standardising tooling, remote state, and workflow conventions.

## Prerequisites

Before making any changes ensure the following tools are installed:

- [Terraform](https://developer.hashicorp.com/terraform/downloads) >= 1.6
- [TFLint](https://github.com/terraform-linters/tflint) (installed automatically by the pre-commit hook)
- [pre-commit](https://pre-commit.com/#install) >= 3.0
- Access to the AWS account with profiles that match the values configured in [`main.tf`](./main.tf)

## Remote state backend

Terraform state is stored remotely in Amazon S3 with state locking provided by DynamoDB. The backend is configured in [`main.tf`](./main.tf) and expects the following to exist before you run `terraform init`:

- S3 bucket: `share-house-portal-terraform-state`
- DynamoDB table: `share-house-portal-terraform-locks`

If the resources do not exist yet, create them manually (once per account) or coordinate with the platform team.

To initialise the backend run:

```bash
terraform init
```

The configuration uses the `workspace_key_prefix` feature so that each Terraform workspace receives its own state file under `env/<workspace>/terraform.tfstate`.

## Working with environments (workspaces)

Terraform workspaces map to the environments defined in [`main.tf`](./main.tf). The default mapping is:

- `dev`
- `staging`
- `prod`

If you run commands in the default workspace Terraform will transparently use the `dev` configuration. Select a workspace before applying changes:

```bash
terraform workspace select dev   # or staging / prod
```

Create a workspace the first time you target a new environment:

```bash
terraform workspace new staging
```

The active workspace is exposed to modules through the `environment_settings` output in [`main.tf`](./main.tf). Extend the `environment_definitions` local map if you need additional per-environment configuration.

## Making changes

1. Select the correct workspace.
2. Run `terraform plan` to review proposed changes.
3. Apply the plan when you are satisfied:

   ```bash
   terraform apply
   ```

4. Commit your changes and open a pull request.

## Pre-commit hooks

Pre-commit hooks are required to keep the Terraform configuration linted and validated. After cloning the repository run:

```bash
pre-commit install
```

The following checks will run automatically before each commit and can also be triggered manually with `pre-commit run --all-files`:

- `terraform fmt` for formatting
- `terraform validate` for static analysis
- `tflint` for best-practice linting

Running these checks locally before pushing helps align results with CI and prevents simple mistakes from landing in the main branch.
