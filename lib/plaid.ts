import { ApiError } from "@/lib/errors"

const PLAID_BASE_URL = process.env.PLAID_BASE_URL ?? "https://sandbox.plaid.com"

interface PlaidRequestOptions {
  endpoint: string
  body: Record<string, unknown>
}

interface PlaidAccount {
  account_id: string
  mask: string | null
  name: string
  subtype: string | null
  type: string
}

export interface TokenizedBankAccount {
  plaidAccountId: string
  stripeBankAccountToken: string
  mask: string | null
  name: string
  subtype: string | null
  type: string
}

function getPlaidCredentials() {
  const clientId = process.env.PLAID_CLIENT_ID
  const secret = process.env.PLAID_SECRET

  if (!clientId || !secret) {
    throw new ApiError("CONFIGURATION_ERROR", {
      message: "Plaid credentials are not configured.",
    })
  }

  return { clientId, secret }
}

async function plaidRequest<T>({ endpoint, body }: PlaidRequestOptions): Promise<T> {
  const { clientId, secret } = getPlaidCredentials()

  const response = await fetch(`${PLAID_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      secret,
      ...body,
    }),
  })

  if (!response.ok) {
    const details = await response.json().catch(() => null)
    throw new ApiError("UPSTREAM_SERVICE_ERROR", {
      message: "Plaid request failed.",
      details,
    })
  }

  return response.json() as Promise<T>
}

export async function createPlaidLinkToken(params: {
  userId: string
  email?: string
  legalName?: string
}) {
  return plaidRequest<{ link_token: string; expiration: string }>({
    endpoint: "/link/token/create",
    body: {
      user: {
        client_user_id: params.userId,
      },
      client_name: "Share House Portal",
      language: "en",
      country_codes: ["US"],
      products: ["auth"],
      account_filters: {
        depository: {
          account_subtypes: ["checking", "savings"],
        },
      },
      webhook: process.env.PLAID_WEBHOOK_URL,
      redirect_uri: process.env.PLAID_REDIRECT_URI,
      consumer_report_user_identity: params.legalName || params.email
        ? {
            first_name: params.legalName?.split(" ")[0] ?? undefined,
            last_name: params.legalName?.split(" ").slice(1).join(" ") || undefined,
            email_address: params.email,
          }
        : undefined,
    },
  })
}

export async function exchangePublicToken(params: {
  publicToken: string
  stripeAccountId?: string
}) {
  const exchange = await plaidRequest<{ access_token: string; item_id: string }>({
    endpoint: "/item/public_token/exchange",
    body: {
      public_token: params.publicToken,
    },
  })

  const accountsResponse = await plaidRequest<{ accounts: PlaidAccount[] }>({
    endpoint: "/accounts/get",
    body: {
      access_token: exchange.access_token,
    },
  })

  const depositoryAccounts = accountsResponse.accounts.filter(
    (account) => account.type === "depository",
  )

  const tokenizedAccounts: TokenizedBankAccount[] = []

  for (const account of depositoryAccounts) {
    const stripeBankToken = await plaidRequest<{ stripe_bank_account_token: string }>({
      endpoint: "/processor/stripe/bank_account_token/create",
      body: {
        access_token: exchange.access_token,
        account_id: account.account_id,
        stripe_account: params.stripeAccountId,
      },
    })

    tokenizedAccounts.push({
      plaidAccountId: account.account_id,
      stripeBankAccountToken: stripeBankToken.stripe_bank_account_token,
      mask: account.mask,
      name: account.name,
      subtype: account.subtype,
      type: account.type,
    })
  }

  return {
    itemId: exchange.item_id,
    tokenizedAccounts,
  }
}

