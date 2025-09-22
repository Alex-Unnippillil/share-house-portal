# Toronto Waste Collection Integration

This integration keeps household garbage, recycling, and organics schedules in sync with the City of Toronto waste collection iCal feed and surfaces actionable reminders for tenants.

## Data flow

1. **Ingestion** – `/api/garbage-events/ingest` fetches and parses the ICS feed for a specific address and writes normalized rows into `public.garbage_events`.
2. **Storage** – events are deduplicated by `(address_normalized, event_date, summary)` and enriched with parsed materials, UID, and raw DTSTART metadata for traceability.
3. **Presentation** – the tenant dashboard renders morning-of and night-before reminders with optional rotating chore assignments for roommates sharing the same address.

## Database schema

`public.garbage_events`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint` | Identity primary key |
| `created_at` | `timestamptz` | Defaults to `now()` |
| `address` | `text` | Human readable address entered by the household |
| `address_normalized` | `text` | Upper-cased, whitespace collapsed version used for lookups |
| `event_date` | `date` | Calendar day of the pickup |
| `summary` | `text` | ICS summary line |
| `description` | `text` | Optional ICS description |
| `materials` | `text[]` | Parsed materials (e.g. `{"Green Bin (organics)","Garbage"}`) |
| `source_url` | `text` | Canonical ICS download URL used for the ingestion run |
| `ics_uid` | `text` | ICS `UID`, if present |
| `ics_dtstart_raw` | `text` | Raw `DTSTART` value for auditing |
| `ics_tzid` | `text` | Parsed `TZID` (when provided) |
| `all_day` | `boolean` | Whether the event represents an all-day pickup |

Indexes:
- Unique constraint on `(address_normalized, event_date, summary)` for idempotent upserts.
- Covering index on `(address_normalized, event_date)` for dashboard queries.
- Partial index on `ics_uid` to speed up deduplication when `UID` values are present.

## Setup checklist

1. **Apply migrations**
   ```bash
   supabase db push
   ```
2. **Configure the ICS endpoint** – add `TORONTO_WASTE_ICS_BASE_URL` to the runtime environment. The value should point to the official City of Toronto ICS generator and must include an `{address}` placeholder (and optionally `{year}`), e.g.
   ```
   TORONTO_WASTE_ICS_BASE_URL="https://secure.toronto.ca/cc_sr_v1/data/swm_waste_wastecalendar/collectionSchedule?address={address}&year={year}&format=ics"
   ```
   > The ingestion API also accepts a one-off `icsUrl` override for manual runs or testing.
3. **Grant service credentials** – ensure `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are available to the Next.js API runtime (the ingestion job uses the service role to bypass RLS).
4. **Schedule jobs** – use Vercel Cron or a task runner (e.g. Supabase Edge Functions) to invoke the ingestion endpoint twice per collection cycle:
   - Evening before pickup (~18:00 Toronto time) to prompt residents to move bins curbside.
   - Early morning on the day-of (~06:00 Toronto time) as a final reminder.

## Running the ingestion job

`POST /api/garbage-events/ingest`

Request body:
```json
{
  "address": "123 Sample St", 
  "year": 2025,
  "clearExisting": true
}
```

Optional fields:
- `year` – integer override when requesting a specific calendar year (defaults to the current year in the Toronto time zone).
- `icsUrl` – explicit ICS URL to fetch (useful for dry runs or archived schedules).
- `clearExisting` – disable deletion of overlapping events by setting to `false` (defaults to `true`).

Example curl command:
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"address":"123 Sample St, Toronto ON"}' \
  https://localhost:3000/api/garbage-events/ingest
```

Successful responses include the normalized address, counts of rows upserted/deleted, and the resolved source URL. Non-200 responses surface fetch/parse errors for operational alerting.

## Tenant experience

The tenant dashboard now includes a "Waste collection reminders" card that:
- Highlights **morning-of** and **night-before** pickups for the authenticated household.
- Displays parsed materials using badges for quick scanning (e.g., Green Bin, Garbage, Recycling).
- Cycles assignments across roommates registered with the same address to evenly distribute bin duties.
- Links back to the source ICS feed for verification.

If a tenant has not saved an address, the card prompts them to update their profile and remains empty until the first ingestion run completes.

## Testing

Unit tests validate the ICS parser against representative Toronto calendar samples:
```bash
pnpm test -- toronto-waste
```

The test suite lives in `tests/toronto-waste-parser.test.ts` and covers DTSTART parsing (all-day vs. timezone-aware events), line folding, material extraction, and duplicate handling.

## Operational notes

- The ingestion endpoint is idempotent thanks to the unique constraint; repeated runs for the same address/day simply refresh metadata.
- For bulk onboarding, invoke the API sequentially per household address—stagger requests to respect City of Toronto rate limits.
- Consider caching the most recent successful ICS payload to fall back during upstream outages (not implemented here).

Refer to this document when wiring new households or diagnosing schedule discrepancies.
