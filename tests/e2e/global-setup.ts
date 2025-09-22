import type { FullConfig } from "@playwright/test"
import { createClient, type PostgrestError } from "@supabase/supabase-js"

import type { Database } from "../../lib/supabase"

const SEED_TAG = "playwright-smoke"

function assertNoError(label: string, error: PostgrestError | null) {
  if (error) {
    throw new Error(`${label}: ${error.message}`)
  }
}

export default async function globalSetup(_config: FullConfig) {
  const supabaseUrl =
    process.env.PLAYWRIGHT_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey =
    process.env.PLAYWRIGHT_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseServiceRoleKey =
    process.env.PLAYWRIGHT_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (supabaseUrl && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl
  }

  if (supabaseAnonKey && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = supabaseAnonKey
  }

  if (supabaseServiceRoleKey && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    process.env.SUPABASE_SERVICE_ROLE_KEY = supabaseServiceRoleKey
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.warn(
      "[playwright] Missing Supabase credentials; skipping smoke fixture provisioning.",
    )
    return
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const seededEmail = process.env.PLAYWRIGHT_SEEDED_EMAIL || "tenant.e2e@roomsily.dev"
  const seededPassword = process.env.PLAYWRIGHT_SEEDED_PASSWORD || "Roomsily!123"
  const seededName = process.env.PLAYWRIGHT_SEEDED_NAME || "E2E Tenant"
  const seededUnitId = process.env.PLAYWRIGHT_SEEDED_UNIT_ID || "unit-e2e-1"

  const listUsersResult = await supabase.auth.admin.listUsers({ perPage: 1000 })

  if ('error' in listUsersResult && listUsersResult.error) {
    throw new Error(`Failed to read Supabase users: ${listUsersResult.error.message}`)
  }

  const existingUser = listUsersResult.data.users.find(
    (user) => user.email?.toLowerCase() === seededEmail.toLowerCase(),
  )

  let userId = existingUser?.id

  if (!userId) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: seededEmail,
      password: seededPassword,
      email_confirm: true,
    })

    if (error || !data?.user) {
      throw new Error(
        `Unable to create seeded tenant ${seededEmail}: ${error?.message ?? "unknown error"}`,
      )
    }

    userId = data.user.id
  } else {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: seededPassword,
      email_confirm: true,
    })

    if (error) {
      throw new Error(`Unable to update seeded tenant credentials: ${error.message}`)
    }
  }

  const now = new Date()
  const isoNow = now.toISOString()
  const isoYesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email: seededEmail,
      full_name: seededName,
      role: "tenant",
      unit_id: seededUnitId,
      rent_share: 1260,
      metadata: { seed: SEED_TAG, onboarding_completed: true } as Database["public"]["Tables"]["profiles"]["Row"]["metadata"],
      updated_at: isoNow,
    },
    { onConflict: "id" },
  )
  assertNoError("profile upsert", profileError)

  const pendingDocumentId =
    process.env.PLAYWRIGHT_SEEDED_DOCUMENT_ID || "11111111-1111-1111-1111-111111111111"
  const signedDocumentId =
    process.env.PLAYWRIGHT_SEEDED_SIGNED_DOCUMENT_ID || "22222222-2222-2222-2222-222222222222"
  const signatureId =
    process.env.PLAYWRIGHT_SEEDED_SIGNATURE_ID || "33333333-3333-3333-3333-333333333333"
  const leaseId = process.env.PLAYWRIGHT_SEEDED_LEASE_ID || "44444444-4444-4444-4444-444444444444"

  const pendingDocumentTitle =
    process.env.PLAYWRIGHT_SEEDED_DOCUMENT_TITLE || "E2E Lease Agreement"
  const signedDocumentTitle =
    process.env.PLAYWRIGHT_SEEDED_SIGNED_DOCUMENT_TITLE || "E2E House Rules"

  const { error: documentsError } = await supabase.from("documents").upsert(
    [
      {
        id: pendingDocumentId,
        title: pendingDocumentTitle,
        description: "Automated smoke-test lease for Roomsily E2E coverage.",
        document_type: "lease",
        status: "pending_signature",
        requires_signature: true,
        tenant_id: userId,
        unit_id: seededUnitId,
        created_by: userId,
        metadata: { seed: SEED_TAG, scenario: "smoke" } as Database["public"]["Tables"]["documents"]["Row"]["metadata"],
        created_at: isoNow,
        updated_at: isoNow,
        version: 1,
      },
      {
        id: signedDocumentId,
        title: signedDocumentTitle,
        description: "Reference policies for the seeded household.",
        document_type: "other",
        status: "signed",
        requires_signature: false,
        tenant_id: userId,
        unit_id: seededUnitId,
        created_by: userId,
        signed_at: isoYesterday,
        metadata: { seed: SEED_TAG, scenario: "smoke" } as Database["public"]["Tables"]["documents"]["Row"]["metadata"],
        created_at: isoYesterday,
        updated_at: isoYesterday,
        version: 1,
      },
    ],
    { onConflict: "id" },
  )
  assertNoError("documents upsert", documentsError)

  const { error: leaseError } = await supabase.from("leases").upsert(
    {
      id: leaseId,
      document_id: pendingDocumentId,
      start_date: "2024-01-01",
      end_date: "2024-12-31",
      rent_amount: 126000,
      rent_frequency: "monthly",
      security_deposit: 126000,
      tenant_ids: [userId],
      property_address: "123 Roomsily Ave, Unit 3B",
      unit_number: "3B",
      landlord_name: "Roomsily Property Management",
      landlord_email: "pm@roomsily.dev",
      auto_renew: true,
      renewal_notice_days: 45,
      status: "active",
      created_at: isoNow,
      updated_at: isoNow,
    },
    { onConflict: "id" },
  )
  assertNoError("lease upsert", leaseError)

  const { error: signatureError } = await supabase.from("document_signatures").upsert(
    {
      id: signatureId,
      document_id: pendingDocumentId,
      signer_id: userId,
      signer_email: seededEmail,
      signer_name: seededName,
      status: "pending",
      signature_data: { seed: SEED_TAG },
      created_at: isoNow,
      updated_at: isoNow,
    },
    { onConflict: "id" },
  )
  assertNoError("document signature upsert", signatureError)

  const paymentId =
    process.env.PLAYWRIGHT_SEEDED_PAYMENT_ID || "55555555-5555-5555-5555-555555555555"

  const { error: paymentError } = await supabase.from("rent_payments").upsert(
    {
      id: paymentId,
      user_id: userId,
      tenant_id: userId,
      unit_id: seededUnitId,
      amount: 126000,
      currency: "usd",
      status: "succeeded",
      payment_method: "card",
      payment_method_type: "card",
      description: "Roomsily smoke test rent payment",
      metadata: { seed: SEED_TAG },
      processed_at: isoYesterday,
      billing_period_start: "2024-06-01T00:00:00.000Z",
      billing_period_end: "2024-06-30T23:59:59.000Z",
      created_at: isoYesterday,
      updated_at: isoNow,
    },
    { onConflict: "id" },
  )
  assertNoError("rent payment upsert", paymentError)

  console.log("[playwright] Seeded Supabase smoke fixtures for", seededEmail)
}
