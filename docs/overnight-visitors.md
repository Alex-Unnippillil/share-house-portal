# Overnight Visitor Quiet Hours Policy

Quiet hours help each household coordinate guest arrivals and departures without disrupting
roommates. This document summarises how the portal enforces the policy and how to update
it when the household guidelines change.

## Household settings

- Quiet hours are stored in `household_settings` alongside the household timezone and the
  policy message presented to residents.
- A default window of **10:00 PM – 7:00 AM (UTC)** is created automatically whenever a
  household is provisioned. Property managers can update the window or policy message via
  Supabase or an administrative surface.
- Each setting row is unique per household. Updating the record will immediately affect
  the visitor request form and any validation logic.

## Visitor request flow

1. Residents submit the visitor form from the dashboard by providing the guest’s name,
   arrival time, departure time, and optional context.
2. The server action ensures the resident belongs to a household, provisions one if
   necessary, and guarantees a quiet-hours record exists.
3. Arrival and departure times are evaluated in the household’s timezone. If either time
   falls inside the quiet-hours window, the request is rejected with the household’s
   policy message.
4. Successful requests are stored in the `visitor_requests` table with a pending status for
   follow-up by roommates or property managers.

## UI guidance

- The visitor form surfaces the quiet-hours window and disables submission when selected
  times overlap with the restricted period.
- Policy copy is shown both in the dashboard header and in server-action responses to
  reinforce expectations.
- Document any exceptions or overrides within the policy message so residents understand
  the approval criteria before submitting.

## Updating the policy

1. Adjust `quiet_hours_start`, `quiet_hours_end`, `timezone`, or `policy_message` in the
   `household_settings` record for the household.
2. The dashboard will pick up the changes immediately; no additional deployment steps are
   required.
3. Communicate updates to residents via announcements or the messaging module to ensure
   everyone understands the new guidelines.
