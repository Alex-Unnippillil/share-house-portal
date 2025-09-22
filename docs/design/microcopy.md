# UX Microcopy Guidelines

Clear, empathetic microcopy keeps roommates informed about what the portal is doing on their behalf. Use the principles below when adding or updating product text.

## Principles
- **Set expectations.** Explain what will happen next and how long it usually takes.
- **Reduce ambiguity.** Replace generic verbs like “Submit” or “Send” with phrasing that reflects the exact action (for example, “Submit overnight visitor request”).
- **Keep ownership clear.** Identify who is being notified or responsible for follow-up so tenants know the task is moving forward.
- **Offer reassurance.** When background tasks run asynchronously, tell users they can continue working elsewhere.

## Loading & Background Tasks
- Include estimated wait times in inline status text (e.g., “Submitting request (≈8s)”).
- Pair long-running operations with a non-blocking toast that calls out the task (“Working in the background… feel free to keep browsing”).
- Announce live updates with `aria-live="polite"` so assistive technology surfaces the status change.
- Avoid spinner-only states; always add a sentence explaining what the system is doing.

## Visitor Booking Microcopy
- Labels should reference the real-world artifact the resident needs (e.g., “Guest full name” instead of “Name”).
- Use `FormDescription` to clarify why each field is required (“We’ll send arrival reminders to this address”).
- Success toasts must confirm the booking was saved **and** that notifications were triggered.
- Error copy should include an action or escalation path (“If this keeps happening, let your property manager know so we can help.”).

## Notification Messaging
- Reference the audience in status copy (“We’re sending "{subject}" to {recipients}.”).
- Provide timing hints in toasts (`showBackgroundToast`) so staff knows when to expect delivery.
- Log support feedback events (`recordSupportFeedback`) for every notification failure or retry so we can measure reductions in “stuck” reports.

## Support Feedback Tracking
- Use the `/api/support-feedback` endpoint with the `recordSupportFeedback` helper to log:
  - The action name (e.g., `bulk_dispatch_error`).
  - The status (`pending`, `resolved`, or `escalated`).
  - Optional metadata such as booking IDs, counts, or error messages.
- Log a `pending` event when long-running work starts, mark it `resolved` on success, and mark it `escalated` on any failure that needs follow-up.
- Keep descriptions short but searchable; they appear in dashboards for property managers.

## Voice & Tone Checklist
- Use plain language: “We”/“you” is preferred to passive phrasing.
- Highlight next steps or who is notified instead of repeating system jargon.
- Offer gratitude or reassurance sparingly—one sentence is enough.
- Avoid technical references in user-facing copy (e.g., “API error”). Summarize the impact instead.
