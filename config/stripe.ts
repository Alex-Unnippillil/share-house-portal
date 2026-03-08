const toBoolean = (value: string | undefined): boolean =>
  value !== undefined && value.toLowerCase() === "true"

export const stripeConfig = {
  capabilities: {
    cardPayments: toBoolean(process.env.NEXT_PUBLIC_STRIPE_CARD_PAYMENTS_ENABLED),
    acssDebit: toBoolean(process.env.NEXT_PUBLIC_STRIPE_ACSS_DEBIT_ENABLED),
  },
  unsupportedPaymentMethods: ["interac_e_transfer"] as const,
}

export type StripeConfig = typeof stripeConfig
