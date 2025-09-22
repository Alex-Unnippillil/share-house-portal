# Overnight Visitor Policy

The Share House Portal tracks overnight guest stays in the `visitor_requests`
table. Each request records the host roommate, the room that will be used, the
requested arrival and departure dates, and whether the stay has been approved by
building staff.

## Monthly Quotas

To keep visitor load balanced across the building we enforce two rolling monthly
limits:

- **Per host** – A roommate can sponsor up to **10 approved guest nights** in a
given calendar month. The allowance refreshes on the first day of each month and
counts any approved stay that overlaps the month, even if it begins earlier.
- **Per room** – A bedroom or shared room can be booked for at most **20 approved
guest nights** in a calendar month. Nights from different hosts are pooled so the
room never exceeds its shared capacity.

These limits apply to the subset of visits with a status of `approved`. Pending,
denied, or cancelled requests do not consume quota.

## Enforcement

A Supabase trigger named `visitor_requests_quota_enforcement` calls the
`enforce_visitor_request_quota` function before insert or update. The function
aggregates the approved nights for the host and room across every month touched
by the stay. If a save would exceed either policy, the database raises a
user-friendly error:

- `Visitor quota exceeded for host …` when a roommate crosses their personal cap.
- `Visitor quota exceeded for room …` when a room would exceed its shared quota.

Because the checks happen in the database the limits are enforced consistently
across the API, dashboards, and background jobs.

## Exceptions and Overrides

Property managers can override the limit by temporarily switching a request back
to `pending`, adjusting the dates, and re-approving after discussing the change
with roommates. Long-term policy adjustments should be implemented by changing
the constants in the enforcement function and communicating the new limits to
residents.
