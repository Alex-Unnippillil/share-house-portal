# Event Catalog

This catalog describes the asynchronous domain events that power the Share House Portal platform. Each event is published to Amazon SNS and delivered to consumers through SQS queues with dedicated dead-letter queues (DLQs). The infrastructure backing these channels is provisioned via Terraform in `infra/terraform/messaging`.

## Messaging Topology

| Event | Version | Description | SNS Topic | SQS Queue | DLQ |
| --- | --- | --- | --- | --- | --- |
| `tenant.application.submitted` | 1.0.0 | Emitted when a prospective tenant completes an application. | `{environment}-tenant-applications-topic` | `{environment}-tenant-applications-queue` | `{environment}-tenant-applications-queue-dlq` |
| `maintenance.request.created` | 1.0.0 | Tracks new maintenance requests raised by tenants or staff. | `{environment}-maintenance-requests-topic` | `{environment}-maintenance-requests-queue` | `{environment}-maintenance-requests-queue-dlq` |
| `rent.payment.received` | 1.0.0 | Indicates a rent payment was processed successfully. | `{environment}-rent-payments-topic` | `{environment}-rent-payments-queue` | `{environment}-rent-payments-queue-dlq` |

> **Note:** Replace `{environment}` with the short environment code used during Terraform deployment (for example, `dev`, `staging`, or `prod`).

## Event Schemas

### Tenant Application Submitted (`tenant.application.submitted`)

- **Topic:** `{environment}-tenant-applications-topic`
- **Primary Queue:** `{environment}-tenant-applications-queue`
- **Dead-Letter Queue:** `{environment}-tenant-applications-queue-dlq`

This CloudEvent is produced by the public web application when a prospective tenant completes the onboarding workflow. Consumers can use it to kick off verification, background checks, or CRM updates.

```json
{
  "id": "7f5396b6-7fd2-4548-9bba-fab4b5b9d95a",
  "source": "share-house-portal.applications",
  "specversion": "1.0",
  "type": "tenant.application.submitted",
  "datacontenttype": "application/json",
  "time": "2024-05-01T16:32:15Z",
  "data": {
    "applicationId": "42f3d1b5-9341-4c65-9e0e-0a8752274f50",
    "applicantId": "2f2d958a-6482-4e5c-9a7d-92f466e7e9fb",
    "propertyId": "84e3d4a1-929d-4ae2-b886-8eb68f1875ff",
    "householdSize": 2,
    "desiredMoveInDate": "2024-06-15",
    "submittedAt": "2024-05-01T16:32:15Z",
    "notes": "Looking for a furnished room."
  }
}
```

#### Data Field Reference

| Field | Type | Description |
| --- | --- | --- |
| `applicationId` | UUID | Unique identifier for the tenant application. |
| `applicantId` | UUID | Identifier for the primary applicant profile. |
| `propertyId` | UUID | Property that the applicant is interested in. |
| `householdSize` | Integer | Number of occupants represented in the application. |
| `desiredMoveInDate` | Date (ISO 8601) | Requested move-in date. |
| `submittedAt` | DateTime (ISO 8601) | Timestamp when the application was submitted. |
| `notes` | String | Optional free-form context supplied by the applicant. |

### Maintenance Request Created (`maintenance.request.created`)

- **Topic:** `{environment}-maintenance-requests-topic`
- **Primary Queue:** `{environment}-maintenance-requests-queue`
- **Dead-Letter Queue:** `{environment}-maintenance-requests-queue-dlq`

This event is emitted whenever a maintenance ticket is opened. Facilities management tools or external vendors can subscribe to automate triage and scheduling.

```json
{
  "id": "6dfb6575-1fe9-4d7b-8a2e-d5cce2440f4d",
  "source": "share-house-portal.maintenance",
  "specversion": "1.0",
  "type": "maintenance.request.created",
  "datacontenttype": "application/json",
  "time": "2024-05-02T09:20:00Z",
  "data": {
    "requestId": "b8fdc89c-8dd2-4a2c-90d4-214c2b975bd0",
    "propertyId": "84e3d4a1-929d-4ae2-b886-8eb68f1875ff",
    "reportedByUserId": "f5a601f4-ea63-46ac-98d0-77e51d1b8f13",
    "category": "Plumbing",
    "priority": "High",
    "description": "Leak detected under the kitchen sink.",
    "reportedAt": "2024-05-02T09:19:55Z",
    "attachments": [
      "https://cdn.share-house.example/maintenance/b8fdc89c/photo-1.jpg"
    ]
  }
}
```

#### Data Field Reference

| Field | Type | Description |
| --- | --- | --- |
| `requestId` | UUID | Unique identifier for the maintenance ticket. |
| `propertyId` | UUID | Property where the issue was reported. |
| `reportedByUserId` | UUID | User account that opened the ticket. |
| `category` | String | Functional category used for routing (e.g., Plumbing, Electrical). |
| `priority` | Enum (`Low`, `Medium`, `High`, `Emergency`) | Urgency classification assigned at creation. |
| `description` | String | Human-readable description of the issue. |
| `reportedAt` | DateTime (ISO 8601) | When the request was submitted. |
| `attachments` | Array of strings | Optional list of URLs pointing to supporting evidence. |

### Rent Payment Received (`rent.payment.received`)

- **Topic:** `{environment}-rent-payments-topic`
- **Primary Queue:** `{environment}-rent-payments-queue`
- **Dead-Letter Queue:** `{environment}-rent-payments-queue-dlq`

The billing service emits this event whenever a rent transaction is captured. Accounting systems and analytics pipelines can subscribe to reconcile balances in near real-time.

```json
{
  "id": "0b40c75a-1473-44e2-a6cb-c89e7a2f5b5e",
  "source": "share-house-portal.billing",
  "specversion": "1.0",
  "type": "rent.payment.received",
  "datacontenttype": "application/json",
  "time": "2024-05-03T14:45:21Z",
  "data": {
    "paymentId": "0f7f279b-5d2c-47c1-b77f-74b6aaf60faf",
    "leaseId": "d94a7b93-7f73-4e53-8a1a-4c0a617f96d9",
    "tenantId": "2f2d958a-6482-4e5c-9a7d-92f466e7e9fb",
    "amount": {
      "currency": "USD",
      "value": 1250.00
    },
    "paidAt": "2024-05-03T14:45:20Z",
    "coveragePeriodStart": "2024-05-01",
    "coveragePeriodEnd": "2024-05-31",
    "paymentMethod": "ACH",
    "status": "Captured"
  }
}
```

#### Data Field Reference

| Field | Type | Description |
| --- | --- | --- |
| `paymentId` | UUID | Unique identifier for the payment transaction. |
| `leaseId` | UUID | Lease agreement credited by the payment. |
| `tenantId` | UUID | Account responsible for the payment. |
| `amount.currency` | ISO 4217 string | Currency code for the transaction. |
| `amount.value` | Decimal | Monetary amount received. |
| `paidAt` | DateTime (ISO 8601) | Timestamp when the payment cleared. |
| `coveragePeriodStart` | Date (ISO 8601) | Beginning of the rent period covered by the payment. |
| `coveragePeriodEnd` | Date (ISO 8601) | End of the rent period covered. |
| `paymentMethod` | Enum (`ACH`, `Card`, `Cash`, `Check`, `Other`) | Channel used to collect the payment. |
| `status` | Enum (`Captured`, `Pending`, `Failed`) | Processing status at the time of publication. |
