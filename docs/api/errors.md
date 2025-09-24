# API Error Catalogue

All Share House Portal API handlers return structured error responses of the form:

```json
{
  "error": {
    "code": "AUTH_UNAUTHORIZED",
    "message": "You must be signed in to access this resource.",
    "docs": "/docs/api/errors.md#auth_unauthorized",
    "details": {
      "optional": "context"
    }
  }
}
```

The `code` field is machine-readable and maps to a default HTTP status. The `docs` URL
links back to this reference so clients can easily look up remediation steps.

## AUTH_UNAUTHORIZED

- **HTTP status**: 401
- **Default message**: You must be signed in to access this resource.
- **When it occurs**: Returned when an authenticated session cannot be established or when the current user does not have permission to perform the requested action.
- **Typical fixes**: Re-authenticate the user and ensure the Supabase session cookies are present before retrying.

## REQUEST_VALIDATION_ERROR

- **HTTP status**: 400
- **Default message**: The request parameters were invalid.
- **When it occurs**: Triggered when query parameters or JSON payloads fail schema validation or required fields are missing.
- **Typical fixes**: Inspect the `details` object for field-specific issues, correct the request payload, and resubmit.

## CONFIGURATION_ERROR

- **HTTP status**: 500
- **Default message**: A required server configuration value is missing or invalid.
- **When it occurs**: Emitted when environment variables such as third-party API keys or Supabase credentials are not configured on the server.
- **Typical fixes**: Ensure the relevant environment variables are set for the deployment environment and redeploy once configuration is complete.

## DATA_FETCH_FAILED

- **HTTP status**: 500
- **Default message**: The server was unable to complete the data operation.
- **When it occurs**: Raised when database reads or writes fail, for example due to Supabase errors while fetching or mutating records.
- **Typical fixes**: Retry the request after a short delay and inspect server logs for the underlying data store error message.

## UPSTREAM_SERVICE_ERROR

- **HTTP status**: 502
- **Default message**: A dependent upstream service returned an error.
- **When it occurs**: Indicates that an external provider such as Stripe or Resend responded with an error while fulfilling the request.
- **Typical fixes**: Check the `details` block for provider-specific diagnostics and confirm that the upstream service is reachable and healthy.

## INTERNAL_SERVER_ERROR

- **HTTP status**: 500
- **Default message**: An unexpected error occurred while processing the request.
- **When it occurs**: Used as a catch-all for unhandled exceptions that occur after the request passes validation.
- **Typical fixes**: Retry the request. If the problem persists, contact support with the request context so the underlying bug can be investigated.
