import { siteConfig } from "./site"

const docsBaseUrl = `${siteConfig.links.github}/blob/main/docs`

export const tenantBillingSettings = {
  eTransfer: {
    recipientName: "Onyx Property Management Trust",
    depositEmail: "payments@onyxsharehouse.com",
    memoLabel: "Invoice reference code",
    autoDepositEnabled: true,
    confirmationWindowHours: 4,
    dailyDepositCutoff: "17:00",
    instructions: [
      "Initiate an Interac e-Transfer from your banking app and choose the Onyx deposit contact.",
      "Enter the rent amount due for this invoice and confirm the auto-deposit banner is displayed before sending.",
      "Paste the generated invoice reference code into the transfer memo so our ledger can match it automatically.",
      "Submit the transfer and keep the confirmation number until the payment appears in your receipts.",
    ],
    fallbackDocumentationUrl: `${docsBaseUrl}/payments/etransfer.md`,
  },
} as const

export type TenantBillingSettings = typeof tenantBillingSettings
