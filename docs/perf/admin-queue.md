# Admin bulk action queue

## Overview
The admin job queue lets property managers schedule large member operations—
like status migrations or fleet-wide notifications—without blocking the UI.
Jobs are persisted in Supabase, processed incrementally by server actions, and
surfaced in the dashboard with real‑time progress updates.

## Data model
- **Table:** `public.admin_jobs`
  - `id uuid` – primary key generated with `gen_random_uuid()`.
  - `type` – `status_update` or `notification` to describe the workload.
  - `status` – life-cycle enum: `queued`, `running`, `completed`, `failed`, `cancelled`.
  - `payload jsonb` – serialized job configuration (filters, targets, message).
  - `result jsonb` – cumulative per-member outcomes and summary counts.
  - `total_tasks` / `processed_tasks` – coarse progress counters.
  - `error text` – latest blocking error message (if any).
  - `requested_by uuid` – actor who created the job (`profiles.id`).
  - Timestamp helpers: `created_at`, `updated_at`, `completed_at`, `cancelled_at`, `last_progress_at`.
- **Profiles:** gained a `status` column (`active | inactive | invited | suspended`) to
  support account state transitions.
- Trigger `trg_update_admin_jobs_updated_at` keeps `updated_at` fresh on every row
  mutation so the UI can sort without extra logic.

## Server actions
`app/dashboard/members/actions/admin-jobs.ts` exposes typed entry points:

| Action | Description |
| --- | --- |
| `listRecentAdminJobs(limit)` | Fetches recent jobs for initial render. |
| `enqueueBulkStatusUpdate(request)` | Resolves target members, creates a job row, and immediately processes the first batch. |
| `enqueueBulkNotification(request)` | Queues a notification-only job with the same semantics. |
| `pollAdminJobs(jobIds)` | Pulls active jobs, executes the next batch (10 members) per job, and returns updated DTOs. |
| `cancelAdminJob(jobId)` | Sets job state to `cancelled` when still running/queued. |
| `retryAdminJob(jobId)` | Refreshes targets via stored filters, resets counters, and requeues work. |
| `getAdminJob(jobId)` | Convenience fetch that also advances queued work. |

### Processing loop
- Jobs store `targetUserIds` in the payload. Each poll loads the next batch of IDs
  (10 at a time) and fetches current profile data.
- **Status updates:** Each member receives a transactional profile update. When
  notifications are enabled, an in-app message is sent with placeholder
  substitution (`{name}`, `{status}`). Any failure marks the entry unsuccessful
  but the job continues.
- **Notifications:** Send in-app messages only, capturing success/failure per
  member.
- Results are merged into the `result` JSON (`entries` + `summary`) so the UI can
  display historical failures.
- Once `processed_tasks` meets `total_tasks`, the job transitions to `completed`
  and records a human-readable error when failures > 0 (e.g., `"2 item(s) failed"`).
- Unexpected errors trigger a `failed` status; retry rehydrates filters to build a
  fresh target list.

## Dashboard experience
`BulkAdminActions` is a client component that receives initial jobs from the
server and:
- Provides a tabbed form for **Status update** and **Notification blast** flows.
- Supports role/status filters, next-status selection, optional notification
  toggle, and customizable copy/CTA URLs.
- Queues jobs via server actions with optimistic toast feedback.
- Polls active jobs every 4 seconds, driving the incremental processing loop.
- Renders job cards showing badges, progress bars, target counts, failure
  summaries, and affordances for cancel/retry.

## Cancellation & retry semantics
- **Cancel** only operates on `queued` or `running` jobs; it simply flips the
  status and leaves existing progress/results intact for auditing.
- **Retry** works for `failed`, `cancelled`, or `completed` jobs with failures.
  Targets are recalculated using the stored filters to ensure the rerun reflects
  current data. Counters and results reset while preserving original metadata.

## Operational notes
- Batch size is tuned to 10 to balance throughput and request duration. Adjust
  `JOB_BATCH_SIZE` if future workloads demand finer control.
- The queue currently uses server actions as the worker loop. For high-volume
  environments, this can be moved to a dedicated Supabase Edge Function or CRON
  job that drains `queued` records on a schedule.
- Payloads intentionally capture filters and summaries to support observability
  and future auditing exports.

## Future enhancements
- Persist per-entry failure reasons into a dedicated table for richer reporting.
- Add email delivery to notification jobs once SMTP credentials are configured.
- Stream real-time updates to clients via Supabase Realtime instead of polling.
- Introduce rate limiting/priority queues if multiple admins schedule overlapping
  workloads.
