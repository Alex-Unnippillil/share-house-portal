export type CmsHelpArticle = {
  id: string
  slug: string
  title: string
  summary: string
  body: string
  url: string
  tags: string[]
  contexts: string[]
  searchKeywords?: string[]
  popularity?: number
  updatedAt: string
}

export const fallbackCmsHelpArticles: CmsHelpArticle[] = [
  {
    id: "help-payments-autopay",
    slug: "payments/autopay-setup",
    title: "Set up autopay for your rent",
    summary:
      "Enable automatic rent collection so every roommate contribution is drafted on schedule without chasing payments.",
    body: `Autopay keeps rent collection predictable. Property managers can invite tenants to enroll directly from the Payments dashboard.
To enable autopay, open the Payments tab, choose a roommate ledger, and click "Enable autopay". Select the contribution amount, due date, and grace period.
Tenants receive an email to confirm the payment method. You can pause or adjust the autopay schedule at any time from the same ledger view.`,
    url: "https://support.roomsily.com/articles/autopay-setup",
    tags: ["autopay", "payments"],
    contexts: ["payments", "dashboard"],
    searchKeywords: ["automatic", "draft", "schedule", "rent", "stripe"],
    popularity: 0.92,
    updatedAt: "2024-06-01T12:00:00.000Z",
  },
  {
    id: "help-payments-receipts",
    slug: "payments/receipt-history",
    title: "Download rent payment receipts",
    summary:
      "Export PDF or CSV payment receipts that include roommate allocations, adjustments, and Stripe transaction IDs.",
    body: `Receipt history in Roomsily centralizes every rent payment. Use the Receipts panel in Payments to download PDF or CSV versions for any processed charge.
Filters let you narrow by roommate, date range, or payment status. Receipts include Stripe IDs, property manager notes, and roommate allocations.`,
    url: "https://support.roomsily.com/articles/payment-receipts",
    tags: ["receipts", "export", "records"],
    contexts: ["payments"],
    searchKeywords: ["download", "history", "pdf", "csv"],
    popularity: 0.85,
    updatedAt: "2024-05-24T08:30:00.000Z",
  },
  {
    id: "help-payments-catch-up",
    slug: "payments/catch-up-balance",
    title: "Create a one-time catch-up payment",
    summary:
      "Use catch-up payments when a roommate needs to settle a balance outside their regular autopay cycle.",
    body: `Catch-up payments are perfect for mid-cycle adjustments or missed autopay drafts.
From the Payments page, open the Catch-up builder and pick the roommates or charges to include. You can split amounts, add notes, and send Stripe Checkout links instantly.`,
    url: "https://support.roomsily.com/articles/catch-up-payments",
    tags: ["catch-up", "stripe", "checkout"],
    contexts: ["payments"],
    searchKeywords: ["one-time", "partial", "settle", "balance"],
    popularity: 0.73,
    updatedAt: "2024-04-18T17:45:00.000Z",
  },
  {
    id: "help-payments-methods",
    slug: "payments/add-payment-method",
    title: "Add or update a tenant payment method",
    summary:
      "Manage saved cards or bank accounts through the Stripe Billing Portal without leaving the Payments page.",
    body: `When a roommate needs to update their payment method, open the Payments page and click "Open Billing Portal". Stripe securely handles card, bank account, and address updates.
Roomsily automatically syncs the preferred method and reflects it the next time autopay runs.`,
    url: "https://support.roomsily.com/articles/update-payment-method",
    tags: ["billing portal", "stripe", "payment method"],
    contexts: ["payments", "account"],
    searchKeywords: ["update card", "bank", "billing"],
    popularity: 0.67,
    updatedAt: "2024-03-21T10:15:00.000Z",
  },
  {
    id: "help-maintenance-submit",
    slug: "maintenance/submit-request",
    title: "Submit a maintenance request with photos",
    summary:
      "Capture detailed maintenance issues, attach photos, and set priorities so property managers can respond quickly.",
    body: `Open the Maintenance Requests page to create a new ticket. Provide a clear title, choose the location, and describe the problem.
Use the file uploader to attach up to five photos or short clips. Select a priority—urgent requests immediately notify managers via email and push notifications.`,
    url: "https://support.roomsily.com/articles/submit-maintenance-request",
    tags: ["maintenance", "requests", "photos"],
    contexts: ["maintenance"],
    searchKeywords: ["report issue", "ticket", "urgent"],
    popularity: 0.9,
    updatedAt: "2024-05-30T09:00:00.000Z",
  },
  {
    id: "help-maintenance-tracking",
    slug: "maintenance/track-progress",
    title: "Track maintenance progress and updates",
    summary:
      "Follow maintenance requests from submission through completion with status changes and manager comments.",
    body: `Roomsily keeps every maintenance request transparent. Each ticket timeline displays acknowledgements, technician assignments, and completion notes.
Enable notifications to receive status changes instantly. For recurring issues, clone the previous ticket so context stays intact.`,
    url: "https://support.roomsily.com/articles/maintenance-tracking",
    tags: ["status", "notifications"],
    contexts: ["maintenance", "dashboard"],
    searchKeywords: ["follow up", "status", "updates", "timeline"],
    popularity: 0.81,
    updatedAt: "2024-04-27T14:05:00.000Z",
  },
  {
    id: "help-maintenance-escalate",
    slug: "maintenance/escalate",
    title: "Escalate an urgent maintenance issue",
    summary:
      "Use escalation workflows when an issue threatens safety or habitability to alert property managers and emergency contacts.",
    body: `Escalations send high-priority notifications to property managers and designated emergency contacts.
When submitting a request, choose "Urgent" priority or edit an existing ticket to escalate it. Provide additional context and emergency contact details so responders know who to reach.`,
    url: "https://support.roomsily.com/articles/escalate-maintenance",
    tags: ["urgent", "escalation", "safety"],
    contexts: ["maintenance", "emergency"],
    searchKeywords: ["emergency", "escalate", "safety"],
    popularity: 0.76,
    updatedAt: "2024-03-12T11:20:00.000Z",
  },
  {
    id: "help-general-notifications",
    slug: "notifications/preferences",
    title: "Manage notification preferences",
    summary:
      "Customize which email, SMS, and push alerts roommates receive for payments, maintenance, and visitor activity.",
    body: `Notification preferences live in Account settings. Toggle payment reminders, maintenance updates, visitor approvals, and community announcements.
Property managers can enforce critical alerts that cannot be disabled, ensuring compliance requirements stay intact.`,
    url: "https://support.roomsily.com/articles/notification-preferences",
    tags: ["notifications", "preferences"],
    contexts: ["account", "payments", "maintenance"],
    searchKeywords: ["alerts", "email", "push"],
    popularity: 0.64,
    updatedAt: "2024-05-05T13:25:00.000Z",
  },
  {
    id: "help-general-documents",
    slug: "documents/signature-workflow",
    title: "Understand Roomsily document workflows",
    summary:
      "Learn how leases and addenda move from draft to signature using Documenso integrations.",
    body: `Roomsily synchronizes with Documenso to distribute, track, and archive leases.
Admins can start from a template, assign signers, and monitor outstanding signatures on the Documents page.
Tenants receive email notifications with secure signing links and can download fully executed agreements after completion.`,
    url: "https://support.roomsily.com/articles/document-workflows",
    tags: ["documents", "documenso"],
    contexts: ["documents", "payments"],
    searchKeywords: ["leases", "sign", "documenso"],
    popularity: 0.58,
    updatedAt: "2024-02-16T16:00:00.000Z",
  },
]
