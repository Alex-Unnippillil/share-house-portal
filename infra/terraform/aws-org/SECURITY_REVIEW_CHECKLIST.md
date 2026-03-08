# Security Review Verification Checklist

Use this checklist to validate the AWS Organization bootstrap before handing off to the security team.

- [ ] **Organization Guardrails**
  - [ ] Confirm both `deny_root_access` and `enforce_mfa` SCPs are attached to the Workloads and Security organizational units.
  - [ ] Verify that the organization feature set is `ALL` and that service control policies are enabled.
- [ ] **Account Provisioning**
  - [ ] Ensure the `*-dev`, `*-staging`, `*-prod`, and `*-logging` accounts exist and are placed in the correct OUs.
  - [ ] Confirm the delegated administrator for AWS Config is the logging account.
- [ ] **IAM Identity Center**
  - [ ] Validate that the Administrator permission set exists with the AWS managed `AdministratorAccess` policy attached.
  - [ ] Confirm the designated administrator group is assigned to each managed account.
  - [ ] Review the session duration and relay state configuration.
- [ ] **AWS Config Aggregator**
  - [ ] Check that the organization aggregator is deployed and reporting data from all regions.
  - [ ] Confirm the aggregator role ARN matches a trusted IAM role with the necessary permissions.
- [ ] **Cost Allocation Tags**
  - [ ] Ensure the `Environment`, `Owner`, and `CostCenter` tags (or customized list) are active in Cost Explorer.
- [ ] **Audit Artifacts**
  - [ ] Capture Terraform plan and apply logs for archival.
  - [ ] Document account IDs, OU IDs, and policy ARNs in the security knowledge base.
