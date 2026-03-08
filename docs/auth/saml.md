# SAML Single Sign-On

Roomsily supports tenant-scoped SAML 2.0 single sign-on so property managers can bring their own identity provider (IdP) while keeping resident accounts mapped to Supabase Auth. This guide covers how metadata ingestion works, how to configure attribute mappings, and the end-to-end setup for Okta and Azure AD tenants.

## Architecture overview

- **Metadata ingestion** – Each household/tenant uploads IdP metadata to `/api/sso/saml/metadata`. The endpoint parses the XML, stores issuer, SSO/Logout endpoints, and signing certificates in the `public.saml_identity_providers` table, and records how assertions map to Supabase fields.
- **Assertion processing** – The assertion consumer service (ACS) at `/api/sso/saml/acs` decodes the SAMLResponse, validates the issuer against the stored metadata, and resolves the user:
  - If a Supabase Auth user already exists for the email, the profile is updated with the latest SAML metadata and tenant context.
  - If no user exists, a new account is created with `email_confirm: true`, the configured default role, and the tenant identifier.
- **Attribute mapping** – Metadata ingestion accepts optional mapping hints for `email`, `fullName`, `role`, and `tenant`. Any unmapped attributes fall back to common SAML claim names or the assertion NameID.

## Prerequisites

1. Supabase project with the migrations from this repository applied (`supabase db push`).
2. Service role credentials configured in the API environment:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=service-role-key
   NEXT_PUBLIC_APP_URL=https://portal.roomsily.example
   ```
3. Access to the IdP admin console (Okta, Azure AD, or another SAML 2.0 provider).
4. Tenant (household) UUID for the Roomsily organisation receiving the integration.

## Ingesting IdP metadata

Submit either raw XML or a metadata URL together with the tenant identifier. The API persists the configuration and applies your attribute mapping preferences.

```bash
curl -X POST https://portal.roomsily.example/api/sso/saml/metadata \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "11111111-1111-1111-1111-111111111111",
    "metadataUrl": "https://example.okta.com/app/roomsily/sso/saml/metadata",
    "defaultRole": "tenant",
    "attributeMapping": {
      "email": "email",
      "fullName": "fullName",
      "role": "role",
      "tenant": "tenant_id"
    }
  }'
```

The response confirms the parsed entity ID, SSO URL, and default role. You can retrieve the stored configuration later via `GET /api/sso/saml/metadata?tenantId=...` to audit or troubleshoot.

## Configuring the ACS endpoint

All IdPs should target the same ACS URL and audience:

- **Assertion Consumer Service (ACS)**: `https://portal.roomsily.example/api/sso/saml/acs`
- **Entity ID / Audience URI**: Use the IdP metadata `entityID` when posting to the ingestion endpoint. The ACS validates that incoming assertions match this issuer.
- **RelayState**: Encode JSON when possible, e.g. `{"tenantId": "<uuid>", "redirectTo": "/dashboard"}`. The ACS uses `tenantId` to resolve the correct configuration and `redirectTo` to build the post-login destination.

## Okta configuration

1. In Okta Admin Console, create a new **SAML 2.0** application integration.
2. Populate the general settings:
   - App name: `Roomsily Tenant Portal`
   - ACS URL: `https://portal.roomsily.example/api/sso/saml/acs`
   - Audience URI (SP Entity ID): reuse the ACS URL or a dedicated URI that matches the metadata you ingest.
   - Name ID format: `EmailAddress` with value `user.email`.
3. Under **Attribute Statements**, add:
   | Name        | Value               |
   |-------------|---------------------|
   | `email`     | `user.email`        |
   | `fullName`  | `user.displayName`  |
   | `role`      | Static string or profile attribute matching Roomsily roles |
   | `tenant_id` | Custom profile attribute storing the Roomsily tenant UUID |
4. Finish the app setup, assign the integration to users/groups, and download the Okta metadata XML.
5. POST the metadata to `/api/sso/saml/metadata` with the tenant UUID and attribute mapping shown above.
6. Test the login by generating an IdP-initiated SSO URL or using the Okta dashboard. Verify that `/api/sso/saml/acs` returns a JSON payload containing the Supabase user ID and redirect target.

## Azure Active Directory configuration

1. Create an **Enterprise Application** in the Azure Portal and choose **SAML** as the single sign-on method.
2. Enter the basic SAML configuration:
   - Identifier (Entity ID): `https://portal.roomsily.example/api/sso/saml/acs`
   - Reply URL (ACS): `https://portal.roomsily.example/api/sso/saml/acs`
   - Sign-on URL (optional): Roomsily dashboard URL for deep-linking after login.
3. Add user attributes and claims:
   | Claim name                                                   | Source attribute |
   |-------------------------------------------------------------|------------------|
   | `email`                                                      | `user.mail`      |
   | `fullName`                                                   | `user.displayname` |
   | `role`                                                       | Custom security group or extension attribute |
   | `tenant_id`                                                  | Custom extension attribute containing the Roomsily tenant UUID |
4. Download the Azure AD Federation Metadata XML and ingest it with `/api/sso/saml/metadata`. Include the same attribute mapping dictionary as in the Okta example.
5. Ensure assigned users have the extension attribute populated with the Roomsily tenant UUID and an allowed role (`tenant`, `roommate`, `property_manager`, `admin`, or `user`).
6. Initiate SSO from Azure (My Apps portal or IdP-initiated link) and confirm the ACS response payload matches the expected user profile.

## Testing the ACS flow locally

1. Run the Vitest integration suite to validate the ACS handler:
   ```bash
   pnpm test saml-acs
   ```
2. Simulate an assertion by encoding the XML and posting to the development ACS endpoint:
   ```bash
   curl -X POST http://localhost:3000/api/sso/saml/acs \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "SAMLResponse=$(cat assertion.xml | base64)" \
     -d 'RelayState={"tenantId":"11111111-1111-1111-1111-111111111111","redirectTo":"/dashboard"}'
   ```
3. Inspect the JSON response and verify that Supabase now contains the linked user profile with `metadata.saml.providerEntityId` populated.

## Troubleshooting tips

- **Issuer mismatch** – Ensure the `entityID` embedded in the IdP metadata matches the issuer inside the SAML assertion. Re-upload metadata whenever Okta/Azure rotates certificates or changes the entity ID.
- **Missing tenant context** – Provide the tenant UUID via RelayState or emit a `tenant_id` attribute from the IdP. Without it, the ACS cannot associate the assertion with the correct configuration.
- **Role mapping issues** – Only the five Roomsily roles are accepted. Use IdP attribute transformations or Okta/Azure expression language to normalise values before they reach the ACS.
- **Certificate rotation** – Re-run metadata ingestion whenever IdP signing certificates change so Supabase stores the latest key material.

With the metadata endpoints and ACS tests in place, each tenant can self-manage their IdP connection while Roomsily keeps resident access under Supabase Auth governance.
