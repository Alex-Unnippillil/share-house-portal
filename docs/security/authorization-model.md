# Authorization Model

## Overview
This document describes the Roomsily authorization strategy for securing
multi-tenant building data. Role-based access control (RBAC) is enforced at both
endpoint and data-layer levels. Every request must include a `BuildingID` that is
validated against the authenticated user's tenancy memberships, ensuring that no
data is exposed across buildings or portfolios.

## RBAC Roles
| Role | Primary Responsibilities | Tenancy Membership |
| --- | --- | --- |
| **Platform Admin** | Manage global configuration, onboard properties, and view compliance dashboards. | Granted to Roomsily operations staff. Authorized for all buildings. |
| **Property Manager** | Manage one or more buildings, configure leasing workflows, invite staff, and view tenant/maintenance details. | Explicitly assigned building list; can act on delegated buildings only. |
| **Building Staff** | Address maintenance tickets, update common area information, and interact with residents. | Single building unless explicitly assigned to multiple. |
| **Resident** | View personal lease details, submit maintenance requests, and manage payments or communication preferences. | Single building derived from active lease. |
| **Support Agent** | Respond to help-desk inquiries with read-only access to scoped resident data. | Temporary assignment via support session tokens scoped to a building. |

Role assignment is maintained within Supabase Auth profiles and synchronized to
an internal `user_roles` table that records `(UserID, BuildingID, Role)` tuples.

## Tenancy and Building Scoping
* All business entities include a `building_id` column. Composite indexes enforce
  `(building_id, id)` lookups for secure filtering.
* API handlers resolve the active BuildingID from one of:
  * URL parameter (`/api/buildings/{buildingId}/...`).
  * Request header `X-Building-Id` (validated against allowed list).
  * Session context when a resident has a single active lease.
* Before executing a query, server actions call `assertTenantAccess(userId,
  buildingId, requiredRole)` to verify RBAC and membership.
* Background jobs and cron tasks run with service accounts that include the
  `Platform Admin` role and must provide explicit BuildingIDs to avoid cross-tenant reads.

## Endpoint Permissions Matrix
| Endpoint | Description | Allowed Roles | Tenancy Scope Enforcement | Notes |
| --- | --- | --- | --- | --- |
| `GET /api/buildings` | List buildings visible to a manager or admin. | Platform Admin, Property Manager | Filters by buildings assigned to the user. | Requires `includeArchived` flag to be explicitly set for closed properties. |
| `GET /api/buildings/{buildingId}` | Retrieve configuration and stats for a building. | Platform Admin, Property Manager, Building Staff | `buildingId` from path is verified against role membership. | Staff receive a subset of configuration fields. |
| `POST /api/buildings/{buildingId}/residents` | Invite or import residents. | Platform Admin, Property Manager | Path parameter BuildingID scoped. | Writes are blocked when lease start date is in the past without approval. |
| `GET /api/buildings/{buildingId}/residents/{residentId}` | View resident profile, lease, and payment status. | Platform Admin, Property Manager, Support Agent (read-only) | Query adds `WHERE resident.building_id = buildingId`. Support agents require time-limited support session token. | Resident role can only access their own profile via `/me`. |
| `POST /api/buildings/{buildingId}/maintenance` | Submit maintenance ticket. | Resident, Building Staff, Property Manager | Tickets always stored with `building_id`. Residents limited to leases they own. | Staff can assign to personnel within same building. |
| `PATCH /api/buildings/{buildingId}/maintenance/{ticketId}` | Update maintenance ticket status or notes. | Building Staff, Property Manager | Enforcement by verifying `ticket.building_id` matches BuildingID and role has `WRITE` permission. | Audit log entry recorded for status changes. |
| `GET /api/buildings/{buildingId}/reports/monthly` | Download operational reports. | Platform Admin, Property Manager | BuildingID validated; aggregated data pre-filtered per building. | Generates signed URL that expires in 15 minutes. |
| `POST /api/send` | Trigger transactional email via Resend. | Platform Admin, Property Manager, Building Staff | BuildingID provided in payload and validated before templating. | Payload sanitized so email content excludes data outside scope. |
| `GET /api/notifications` | Retrieve recent in-app notifications for the authenticated user. | Tenant, Roommate, Property Manager, Admin | Scoped by Supabase RLS on `user_id`; downstream joins enforce building membership. | Query params (`startDate`, `endDate`, `page`, `limit`) validated with Zod. Date ranges clamped to 90 days and page sizes capped at 100; oversized or malformed attempts are logged and rejected. |
| `GET /api/auth/callback` | Complete OAuth login. | All authenticated roles | No BuildingID required; associates user with building memberships post login. | Redirect flow issues a JWT with role claims. |

All new endpoints must declare required roles and tenancy scope annotations in
`app/api/_middleware.ts` to automate enforcement.

## Data Classification and Handling
### Personally Identifiable Information (PII)
| Field / Dataset | Classification | Access Roles | Retention | Audit Logging |
| --- | --- | --- | --- | --- |
| Resident profile (name, email, phone) | PII (Moderate) | Platform Admin, Property Manager, Support Agent (read-only), Resident (self) | Retained for duration of active lease + 3 years for regulatory needs. | Read and update events logged with user, timestamp, BuildingID. |
| Resident government ID uploads | PII (High / Sensitive) | Platform Admin (limited), Property Manager (view-only), Compliance Officer | Stored until lease verification complete, then redacted to hash after 30 days. | Access attempts logged with purpose and granted role. |
| Payment method tokens | Financial (Sensitive) | Platform Admin (limited), Property Manager (masked), Resident | Tokenized via PSP; stored for active billing cycle + 1 year for disputes. | All create/delete actions logged; PSP transaction IDs captured. |
| Maintenance requests with unit photos | PII (Low) | Platform Admin, Property Manager, Building Staff | Retained for ticket lifecycle + 2 years for historical reporting. | Status change and file download events logged. |

### Building Operations Data
| Field / Dataset | Classification | Access Roles | Retention | Audit Logging |
| --- | --- | --- | --- | --- |
| Building configuration (amenities, policies) | Internal | Platform Admin, Property Manager, Building Staff (read) | Persisted while property active; archived 3 years post decommission. | Configuration changes recorded with diff snapshot. |
| Work order schedules | Internal | Platform Admin, Property Manager, Building Staff | Retained for ticket lifecycle + 2 years. | Assignment changes logged. |
| Analytics dashboards | Internal Aggregated | Platform Admin, Property Manager | Rolling 24 months of data, then aggregated. | Dashboard exports recorded with report name and BuildingID. |

### Communication Logs
| Field / Dataset | Classification | Access Roles | Retention | Audit Logging |
| --- | --- | --- | --- | --- |
| Email delivery logs | Internal | Platform Admin, Property Manager | 18 months for deliverability monitoring. | Each log record contains sender, recipient, BuildingID, template ID. |
| In-app messages | PII (Low) | Platform Admin, Property Manager, Resident (self) | Retained for conversation + 1 year or until resident request for deletion. | Message reads/writes appended to audit trail with message ID. |
| Support chat transcripts | PII (Moderate) | Platform Admin, Support Agent | Retained for case lifecycle + 2 years. | Export and deletion events logged with support case ID. |

## Retention Timelines
* Purge jobs run monthly to delete data whose retention period has expired.
* Redaction occurs via scheduled Supabase functions that replace sensitive fields
  (e.g., government IDs) with irreversible hashes while preserving referential
  integrity.
* Data subject deletion requests trigger immediate queueing of purge workflows
  and store the request metadata for accountability.

## Audit Logging Requirements
* Centralized audit log table keyed by `(BuildingID, EntityType, EntityID, Timestamp)`.
* Entries capture acting user, role, source IP, request identifier, and change summary.
* Audit logs are immutable and streamed to long-term storage (AWS S3 with 7-year
  retention) via daily exports.
* Alerting rules flag anomalous access patterns, such as support agents querying
  residents outside their assigned BuildingID.
* Audit logs are accessible only to Platform Admins and Security Engineers with
  read-only tooling accounts.
