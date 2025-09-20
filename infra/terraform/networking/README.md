# Networking Terraform Module

This module provisions DNS and edge networking resources for the Share House Portal deployment. It creates the public Route 53 hosted zone, issues ACM certificates for CloudFront, and configures CloudFront distributions for the single-page application (SPA) and media CDN.

## Deployment Prerequisites

Before applying the Terraform configuration:

1. **Buckets**
   - Create and populate the S3 bucket that will host the compiled SPA assets.
   - Create the S3 bucket that stores user-uploaded media.
   - Update each bucket policy to allow the CloudFront Origin Access Controls (OACs) created by this module to read objects. The AWS console wizard or the `aws cloudfront create-origin-access-control` CLI output provides the necessary policy snippets.
2. **API Origin**
   - Identify the API endpoint that should receive traffic (for example, an API Gateway custom domain or an Application Load Balancer).
   - Collect the endpoint's DNS name and hosted zone ID so that Terraform can create an alias record for `api.<root-domain>`.
3. **Logging (optional)**
   - If you plan to store CloudFront access logs, create the destination S3 bucket first and provide its `bucket.s3.amazonaws.com` domain in the `access_logs_bucket` variable.
4. **DNS Ownership**
   - Ensure the `root_domain` is registered in Route 53 or that you are ready to delegate it from the current registrar to the hosted zone that this module creates.

## Applying the Configuration

1. Populate a Terraform variables file (e.g. `prod.tfvars`) with the required inputs: project name, environment, AWS region, domain names, S3 bucket names, API endpoint details, and optional logging configuration.
2. Initialize Terraform from the `infra/terraform/networking` directory:

   ```bash
   terraform init
   ```

3. Review the plan to confirm the resources and DNS changes:

   ```bash
   terraform plan -var-file=prod.tfvars
   ```

4. Apply the configuration when ready:

   ```bash
   terraform apply -var-file=prod.tfvars
   ```

Terraform will provision the hosted zone, request and validate ACM certificates, create the CloudFront distributions, and write DNS aliases for the SPA, media, and API endpoints.

## Post-Deployment Validation Checklist

After a successful apply, validate the deployment before cutting over production DNS:

1. **Certificate Validation**
   - Confirm in the AWS Certificate Manager (us-east-1) console that the certificate issued for the web, media, and API domains is in the `Issued` state.
2. **CloudFront Status**
   - Wait for the SPA and media distributions to reach the `Deployed` status and note their domain names.
   - Test the default CloudFront domain for the SPA (e.g. `dxxxx.cloudfront.net`) to verify that the SPA loads and client-side routing works (refresh deep links and confirm 403/404 responses render the SPA).
   - Test the `/api/*` routes through CloudFront to ensure they successfully proxy to the API origin.
   - Test media URLs to confirm caching headers, CORS rules, and object retrieval function as expected.
3. **Origin Access Controls**
   - Verify that the S3 buckets deny public access and that objects can only be retrieved through CloudFront by requesting them directly with `curl -I` against the CloudFront domain.
4. **Monitoring and Logs**
   - If access logging is enabled, check that log files are written to the target S3 bucket using the configured prefixes.
5. **Health Checks**
   - If the API origin exposes a health endpoint, confirm that it is reachable through CloudFront to detect issues before DNS cutover.

## DNS Cutover Plan

1. **Lower TTLs**
   - At least 24 hours before migration, reduce the TTL of the existing production DNS records (if managed outside Route 53) to a short value such as 60 seconds.
2. **Pre-Cutover Smoke Test**
   - Create temporary hosts file entries mapping the new CloudFront alias to the final domain names and perform end-to-end testing, including authentication flows, API calls, and media uploads.
3. **Update Authoritative DNS**
   - When ready, either:
     - Update the registrar to delegate the domain to the name servers generated for the new Route 53 hosted zone, **or**
     - Modify the existing hosted zone records to alias to the CloudFront distributions and API origin defined by this module.
4. **Monitor Traffic**
   - Track application logs, CloudFront metrics, and API health for at least one hour after cutover to ensure traffic is flowing correctly.
5. **Raise TTLs**
   - Once satisfied with stability, increase record TTLs to production values (e.g. 300 or 600 seconds) to reduce DNS query volume.
6. **Rollback Strategy**
   - Keep the previous DNS configuration details on hand. If critical issues appear, revert the aliases to the prior endpoints or switch the registrar delegation back while investigating.

These steps ensure the Share House Portal deployment is validated and that DNS cutover is orderly with minimal downtime.
