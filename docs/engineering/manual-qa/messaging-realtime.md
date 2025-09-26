# Messaging – Realtime Manual QA

The goal of this smoke test is to confirm realtime updates for roommate threads propagate to every open session within ~250 ms.

## Pre-requisites

- Start the web app locally with `pnpm dev` and ensure the Supabase `.env` values point at a database seeded with `threads` and `messages` rows.
- Log into the Supabase project (Studio or CLI) so you can insert records into the `public.messages` table.

## Steps

1. **Open two browser sessions**
   - Launch two different browsers (or a browser + incognito window) and sign in with accounts that can access `/messaging`.
   - Navigate both sessions to `http://localhost:3000/messaging` and keep them visible side-by-side.
2. **Verify initial hydration**
   - Confirm each session lists the same set of threads and the main panel shows the pinned/most recent thread.
   - In Supabase Studio, open the `threads` table and update the `summary` of a visible row; the change should appear in both sessions almost immediately.
3. **Insert a live message**
   - In Supabase Studio (SQL editor or table view), insert a new row into `public.messages` targeting the active thread ID. Populate `content` with a short JSON array (e.g., `{"content": ["Realtime check"]}` if using the GUI) and provide `author_name`/`author_role`.
   - As soon as the insert succeeds, observe both browsers: the new post should render without a refresh, and the thread list timestamps should update in under a quarter of a second.
4. **Update an existing message**
   - Locate the new message row and modify its `content` field.
   - Confirm the post body updates in both sessions without reloading the page.
5. **Clean up**
   - Delete the test message row so the shared dataset returns to its pre-test state.

## Expected results

- Thread list metadata (last message timestamp, summary) refreshes in both sessions immediately after the `threads` row is edited.
- New messages appear in both sessions with no manual refresh and within ~250 ms of the Supabase insert completing.
- Editing or deleting the message row updates or removes the post across both browsers in realtime.
- No console errors appear in either browser during the test.

