import type { SupabaseClient } from "@supabase/supabase-js"
import type Stripe from "stripe"

import type { Database, Json } from "@/lib/supabase"
import type { PrivacyRequest, PrivacyRequestEvent } from "@/lib/data/privacy"

export type PrivacyRequestAction = PrivacyRequest["request_type"]
export type PrivacyRequestStatus = PrivacyRequest["status"]

export type ServiceSupabaseClient = SupabaseClient<Database, "public">

type TableRow<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]

type Optional<T> = T | null | undefined

export interface TenantDataBundle {
  profile: Optional<TableRow<"profiles">>
  rentPayments: TableRow<"rent_payments">[]
  subscriptions: TableRow<"subscriptions">[]
  documents: TableRow<"documents">[]
  documentSignatures: TableRow<"document_signatures">[]
  documentAccessLogs: TableRow<"document_access_logs">[]
  leases: TableRow<"leases">[]
  amenityBookings: TableRow<"amenity_bookings">[]
  maintenanceRequests: TableRow<"maintenance_requests">[]
  visitorLogs: TableRow<"visitor_logs">[]
  notifications: TableRow<"notifications">[]
  emailNotifications: TableRow<"email_notifications">[]
}

interface CreatePrivacyRequestInput {
  tenantId: string
  requesterEmail?: string
  requestType: PrivacyRequestAction
  supabase: ServiceSupabaseClient
  metadata?: Json
}

interface PrivacyEventInput {
  supabase: ServiceSupabaseClient
  requestId: string
  status: string
  detail?: string
  actor?: string
}

interface UpdatePrivacyRequestInput {
  supabase: ServiceSupabaseClient
  requestId: string
  status: PrivacyRequestStatus
  failureReason?: string
  completedAt?: string
  exportLocation?: string | null
  processedBy?: string | null
  metadata?: Json
}

const REDACTED_VALUE = "[REDACTED]"
const REDACTED_TEXT = "[REDACTED CONTENT]"

function withRedactionMetadata(original: Json | null, context: string): Json {
  const base = typeof original === "object" && original !== null ? original : {}
  return {
    ...(base as Record<string, unknown>),
    redacted: true,
    redacted_context: context,
    redacted_at: new Date().toISOString(),
  }
}

export async function createPrivacyRequestRecord({
  supabase,
  tenantId,
  requesterEmail,
  requestType,
  metadata,
}: CreatePrivacyRequestInput): Promise<PrivacyRequest> {
  const { data, error } = await supabase
    .from("privacy_requests")
    .insert({
      tenant_id: tenantId,
      requester_email: requesterEmail ?? null,
      request_type: requestType,
      status: "received",
      metadata: metadata ?? null,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Unable to register privacy request: ${error.message}`)
  }

  return data as PrivacyRequest
}

export async function logPrivacyEvent({
  supabase,
  requestId,
  status,
  detail,
  actor,
}: PrivacyEventInput): Promise<PrivacyRequestEvent> {
  const { data, error } = await supabase
    .from("privacy_request_events")
    .insert({
      request_id: requestId,
      status,
      detail: detail ?? null,
      actor: actor ?? null,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Unable to log privacy request event: ${error.message}`)
  }

  return data as PrivacyRequestEvent
}

export async function updatePrivacyRequest({
  supabase,
  requestId,
  status,
  failureReason,
  completedAt,
  exportLocation,
  processedBy,
  metadata,
}: UpdatePrivacyRequestInput): Promise<void> {
  const updatePayload: Partial<PrivacyRequest> = {
    status,
    failure_reason: failureReason ?? null,
    completed_at: completedAt ?? null,
    export_location: exportLocation ?? null,
    processed_by: processedBy ?? null,
    metadata: metadata ?? null,
  }

  const { error } = await supabase
    .from("privacy_requests")
    .update(updatePayload)
    .eq("id", requestId)

  if (error) {
    throw new Error(`Unable to update privacy request: ${error.message}`)
  }
}

export async function collectTenantData(
  supabase: ServiceSupabaseClient,
  tenantId: string,
): Promise<TenantDataBundle> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", tenantId)
    .maybeSingle()

  if (profileError) {
    throw new Error(`Unable to load tenant profile: ${profileError.message}`)
  }

  const tenantEmail = profile?.email ?? undefined

  const [
    rentPayments,
    subscriptions,
    documents,
    documentSignaturesById,
    documentSignaturesByEmail,
    documentAccessLogs,
    leases,
    amenityBookings,
    maintenanceRequestsRequested,
    maintenanceRequestsAssigned,
    visitorLogs,
    notifications,
    emailNotificationsByUser,
    emailNotificationsByEmail,
  ] = await Promise.all([
    supabase
      .from("rent_payments")
      .select("*")
      .or(`tenant_id.eq.${tenantId},user_id.eq.${tenantId}`),
    supabase.from("subscriptions").select("*").eq("user_id", tenantId),
    supabase
      .from("documents")
      .select("*")
      .or(`tenant_id.eq.${tenantId},created_by.eq.${tenantId}`),
    supabase
      .from("document_signatures")
      .select("*")
      .eq("signer_id", tenantId),
    tenantEmail
      ? supabase
          .from("document_signatures")
          .select("*")
          .eq("signer_email", tenantEmail)
      : Promise.resolve({ data: [], error: null } as any),
    supabase
      .from("document_access_logs")
      .select("*")
      .eq("user_id", tenantId),
    supabase
      .from("leases")
      .select("*")
      .contains("tenant_ids", [tenantId]),
    supabase
      .from("amenity_bookings")
      .select("*")
      .eq("created_by", tenantId),
    supabase
      .from("maintenance_requests")
      .select("*")
      .eq("requested_by", tenantId),
    supabase
      .from("maintenance_requests")
      .select("*")
      .eq("assigned_to", tenantId),
    supabase
      .from("visitor_logs")
      .select("*")
      .eq("host_id", tenantId),
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", tenantId),
    supabase
      .from("email_notifications")
      .select("*")
      .eq("user_id", tenantId),
    tenantEmail
      ? supabase
          .from("email_notifications")
          .select("*")
          .eq("recipient", tenantEmail)
      : Promise.resolve({ data: [], error: null } as any),
  ])

  const datasets = [
    { label: "rent payments", response: rentPayments },
    { label: "subscriptions", response: subscriptions },
    { label: "documents", response: documents },
    { label: "document signatures", response: documentSignaturesById },
    { label: "document signatures", response: documentSignaturesByEmail },
    { label: "document access logs", response: documentAccessLogs },
    { label: "leases", response: leases },
    { label: "amenity bookings", response: amenityBookings },
    { label: "maintenance requests", response: maintenanceRequestsRequested },
    { label: "maintenance requests", response: maintenanceRequestsAssigned },
    { label: "visitor logs", response: visitorLogs },
    { label: "notifications", response: notifications },
    { label: "email notifications", response: emailNotificationsByUser },
    { label: "email notifications", response: emailNotificationsByEmail },
  ] as const

  for (const dataset of datasets) {
    if (dataset.response.error) {
      throw new Error(
        `Unable to load ${dataset.label}: ${dataset.response.error.message}`,
      )
    }
  }

  const mergeById = <T extends { id: string }>(
    ...lists: (T[] | null | undefined)[]
  ): T[] => {
    const map = new Map<string, T>()
    for (const list of lists) {
      for (const item of list ?? []) {
        map.set(item.id, item)
      }
    }
    return Array.from(map.values())
  }

  return {
    profile: profile ?? null,
    rentPayments: (rentPayments.data as TableRow<"rent_payments">[] | null) ?? [],
    subscriptions:
      (subscriptions.data as TableRow<"subscriptions">[] | null) ?? [],
    documents: (documents.data as TableRow<"documents">[] | null) ?? [],
    documentSignatures: mergeById(
      documentSignaturesById.data as TableRow<"document_signatures">[] | null,
      documentSignaturesByEmail.data as TableRow<"document_signatures">[] | null,
    ),
    documentAccessLogs:
      (documentAccessLogs.data as TableRow<"document_access_logs">[] | null) ?? [],
    leases: (leases.data as TableRow<"leases">[] | null) ?? [],
    amenityBookings:
      (amenityBookings.data as TableRow<"amenity_bookings">[] | null) ?? [],
    maintenanceRequests: mergeById(
      maintenanceRequestsRequested.data as
        | TableRow<"maintenance_requests">[]
        | null,
      maintenanceRequestsAssigned.data as
        | TableRow<"maintenance_requests">[]
        | null,
    ),
    visitorLogs:
      (visitorLogs.data as TableRow<"visitor_logs">[] | null) ?? [],
    notifications:
      (notifications.data as TableRow<"notifications">[] | null) ?? [],
    emailNotifications: mergeById(
      emailNotificationsByUser.data as TableRow<"email_notifications">[] | null,
      emailNotificationsByEmail.data as TableRow<"email_notifications">[] | null,
    ),
  }
}

export interface RedactedTenantData {
  profile: Optional<TableRow<"profiles">>
  rentPayments: TableRow<"rent_payments">[]
  subscriptions: TableRow<"subscriptions">[]
  documents: TableRow<"documents">[]
  documentSignatures: TableRow<"document_signatures">[]
  documentAccessLogs: TableRow<"document_access_logs">[]
  leases: TableRow<"leases">[]
  amenityBookings: TableRow<"amenity_bookings">[]
  maintenanceRequests: TableRow<"maintenance_requests">[]
  visitorLogs: TableRow<"visitor_logs">[]
  notifications: TableRow<"notifications">[]
  emailNotifications: TableRow<"email_notifications">[]
}

export function redactTenantData(bundle: TenantDataBundle): RedactedTenantData {
  const redactProfile = (profile: Optional<TableRow<"profiles">>) => {
    if (!profile) return null
    return {
      ...profile,
      email: profile.email ? REDACTED_VALUE : profile.email,
      phone: profile.phone ? REDACTED_VALUE : profile.phone,
      full_name: profile.full_name ? REDACTED_VALUE : profile.full_name,
      username: profile.username ? REDACTED_VALUE : profile.username,
      website: profile.website ? REDACTED_VALUE : profile.website,
      stripe_customer_id: profile.stripe_customer_id
        ? REDACTED_VALUE
        : profile.stripe_customer_id,
      metadata: withRedactionMetadata(profile.metadata, "profile"),
    }
  }

  const redactRentPayment = (payment: TableRow<"rent_payments">) => ({
    ...payment,
    stripe_payment_intent_id: payment.stripe_payment_intent_id
      ? REDACTED_VALUE
      : null,
    stripe_charge_id: payment.stripe_charge_id ? REDACTED_VALUE : null,
    stripe_customer_id: payment.stripe_customer_id ? REDACTED_VALUE : null,
    stripe_subscription_id: payment.stripe_subscription_id
      ? REDACTED_VALUE
      : null,
    payer_name: payment.payer_name ? REDACTED_VALUE : payment.payer_name,
    metadata: withRedactionMetadata(payment.metadata, "rent_payments"),
  })

  const redactDocument = (doc: TableRow<"documents">) => ({
    ...doc,
    title: doc.title ? `${doc.title} (redacted)` : doc.title,
    description: doc.description ? REDACTED_TEXT : doc.description,
    documenso_envelope_id: doc.documenso_envelope_id
      ? REDACTED_VALUE
      : doc.documenso_envelope_id,
    metadata: withRedactionMetadata(doc.metadata, "documents"),
  })

  const redactDocumentSignature = (
    signature: TableRow<"document_signatures">
  ) => ({
    ...signature,
    signer_email: signature.signer_email ? REDACTED_VALUE : signature.signer_email,
    signer_name: signature.signer_name ? REDACTED_VALUE : signature.signer_name,
    ip_address: signature.ip_address ? REDACTED_VALUE : signature.ip_address,
    user_agent: signature.user_agent ? REDACTED_VALUE : signature.user_agent,
    signature_data: signature.signature_data
      ? withRedactionMetadata(signature.signature_data, "document_signatures")
      : signature.signature_data,
  })

  const redactMaintenance = (
    request: TableRow<"maintenance_requests">
  ) => ({
    ...request,
    description: request.description ? REDACTED_TEXT : request.description,
    notes: request.notes ? REDACTED_TEXT : request.notes,
    metadata: withRedactionMetadata(request.metadata, "maintenance_requests"),
  })

  const redactVisitor = (visitor: TableRow<"visitor_logs">) => ({
    ...visitor,
    guest_name: visitor.guest_name ? REDACTED_VALUE : visitor.guest_name,
    guest_email: visitor.guest_email ? REDACTED_VALUE : visitor.guest_email,
    guest_phone: visitor.guest_phone ? REDACTED_VALUE : visitor.guest_phone,
    emergency_contact: visitor.emergency_contact
      ? REDACTED_VALUE
      : visitor.emergency_contact,
    special_notes: visitor.special_notes ? REDACTED_TEXT : visitor.special_notes,
  })

  const redactNotification = (notification: TableRow<"notifications">) => ({
    ...notification,
    message: notification.message ? REDACTED_TEXT : notification.message,
    metadata: withRedactionMetadata(notification.metadata, "notifications"),
  })

  const redactEmailNotification = (
    emailNotification: TableRow<"email_notifications">
  ) => ({
    ...emailNotification,
    recipient: emailNotification.recipient ? REDACTED_VALUE : null,
    subject: emailNotification.subject ? `${REDACTED_TEXT}` : null,
    metadata: withRedactionMetadata(
      emailNotification.metadata,
      "email_notifications",
    ),
  })

  return {
    profile: redactProfile(bundle.profile),
    rentPayments: bundle.rentPayments.map(redactRentPayment),
    subscriptions: bundle.subscriptions.map((subscription) => ({
      ...subscription,
      stripe_subscription_id: subscription.stripe_subscription_id
        ? REDACTED_VALUE
        : subscription.stripe_subscription_id,
      stripe_customer_id: subscription.stripe_customer_id
        ? REDACTED_VALUE
        : subscription.stripe_customer_id,
      metadata: withRedactionMetadata(subscription.metadata, "subscriptions"),
    })),
    documents: bundle.documents.map(redactDocument),
    documentSignatures: bundle.documentSignatures.map(redactDocumentSignature),
    documentAccessLogs: bundle.documentAccessLogs.map((log) => ({
      ...log,
      ip_address: log.ip_address ? REDACTED_VALUE : log.ip_address,
      user_agent: log.user_agent ? REDACTED_VALUE : log.user_agent,
      metadata: withRedactionMetadata(log.metadata, "document_access_logs"),
    })),
    leases: bundle.leases.map((lease) => ({
      ...lease,
      tenant_ids: lease.tenant_ids.filter((id) => id !== bundle.profile?.id),
      special_terms: lease.special_terms ? REDACTED_TEXT : lease.special_terms,
    })),
    amenityBookings: bundle.amenityBookings.map((booking) => ({
      ...booking,
      metadata: withRedactionMetadata(booking.metadata, "amenity_bookings"),
    })),
    maintenanceRequests: bundle.maintenanceRequests.map(redactMaintenance),
    visitorLogs: bundle.visitorLogs.map(redactVisitor),
    notifications: bundle.notifications.map(redactNotification),
    emailNotifications: bundle.emailNotifications.map(redactEmailNotification),
  }
}

interface SupabaseCleanupResult {
  rentPaymentsUpdated: number
  subscriptionsUpdated: number
  documentsUpdated: number
  documentSignaturesUpdated: number
  documentAccessLogsRemoved: number
  leasesUpdated: number
  amenityBookingsDeleted: number
  maintenanceRequestsUpdated: number
  visitorLogsUpdated: number
  notificationsDeleted: number
  emailNotificationsDeleted: number
}

export async function purgeTenantFromSupabase(
  supabase: ServiceSupabaseClient,
  tenantId: string,
  bundle: TenantDataBundle,
): Promise<SupabaseCleanupResult> {
  const profileMetadata = withRedactionMetadata(
    bundle.profile?.metadata ?? null,
    "profile",
  )

  const [{ error: profileError }] = await Promise.all([
    supabase
      .from("profiles")
      .update({
        email: null,
        phone: null,
        full_name: "Former Tenant",
        username: null,
        website: null,
        stripe_customer_id: null,
        metadata: profileMetadata,
      })
      .eq("id", tenantId),
  ])

  if (profileError) {
    throw new Error(`Unable to anonymise tenant profile: ${profileError.message}`)
  }

  const updates: SupabaseCleanupResult = {
    rentPaymentsUpdated: 0,
    subscriptionsUpdated: 0,
    documentsUpdated: 0,
    documentSignaturesUpdated: 0,
    documentAccessLogsRemoved: 0,
    leasesUpdated: 0,
    amenityBookingsDeleted: 0,
    maintenanceRequestsUpdated: 0,
    visitorLogsUpdated: 0,
    notificationsDeleted: 0,
    emailNotificationsDeleted: 0,
  }

  if (bundle.rentPayments.length) {
    const { count, error } = await supabase
      .from("rent_payments")
      .update({
        stripe_payment_intent_id: null,
        stripe_charge_id: null,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        payer_name: null,
        metadata: withRedactionMetadata(null, "rent_payments"),
      })
      .or(`tenant_id.eq.${tenantId},user_id.eq.${tenantId}`)
      .select("id", { count: "exact" })

    if (error) {
      throw new Error(`Unable to anonymise rent payments: ${error.message}`)
    }
    updates.rentPaymentsUpdated = count ?? 0
  }

  if (bundle.subscriptions.length) {
    const { count, error } = await supabase
      .from("subscriptions")
      .update({
        stripe_subscription_id: null,
        stripe_customer_id: null,
        metadata: withRedactionMetadata(null, "subscriptions"),
      })
      .eq("user_id", tenantId)
      .select("id", { count: "exact" })
    if (error) {
      throw new Error(`Unable to anonymise subscriptions: ${error.message}`)
    }
    updates.subscriptionsUpdated = count ?? 0
  }

  if (bundle.documents.length) {
    const { count, error } = await supabase
      .from("documents")
      .update({
        tenant_id: null,
        documenso_envelope_id: null,
        metadata: withRedactionMetadata(null, "documents"),
      })
      .or(`tenant_id.eq.${tenantId},created_by.eq.${tenantId}`)
      .select("id", { count: "exact" })
    if (error) {
      throw new Error(`Unable to anonymise documents: ${error.message}`)
    }
    updates.documentsUpdated = count ?? 0
  }

  if (bundle.documentSignatures.length) {
    const { count, error } = await supabase
      .from("document_signatures")
      .update({
        signer_email: null,
        signer_name: null,
        ip_address: null,
        user_agent: null,
        signature_data: null,
      })
      .eq("signer_id", tenantId)
      .select("id", { count: "exact" })
    if (error) {
      throw new Error(`Unable to anonymise document signatures: ${error.message}`)
    }
    updates.documentSignaturesUpdated = count ?? 0
  }

  if (bundle.documentAccessLogs.length) {
    const { count, error } = await supabase
      .from("document_access_logs")
      .delete()
      .eq("user_id", tenantId)
      .select("id", { count: "exact" })
    if (error) {
      throw new Error(`Unable to remove document access logs: ${error.message}`)
    }
    updates.documentAccessLogsRemoved = count ?? 0
  }

  if (bundle.leases.length) {
    for (const lease of bundle.leases) {
      const remainingTenantIds = lease.tenant_ids.filter((id) => id !== tenantId)
      const { error } = await supabase
        .from("leases")
        .update({ tenant_ids: remainingTenantIds })
        .eq("id", lease.id)
      if (error) {
        throw new Error(`Unable to update lease ${lease.id}: ${error.message}`)
      }
      updates.leasesUpdated += 1
    }
  }

  if (bundle.amenityBookings.length) {
    const { count, error } = await supabase
      .from("amenity_bookings")
      .delete()
      .eq("created_by", tenantId)
      .select("id", { count: "exact" })
    if (error) {
      throw new Error(`Unable to purge amenity bookings: ${error.message}`)
    }
    updates.amenityBookingsDeleted = count ?? 0
  }

  if (bundle.maintenanceRequests.length) {
    const { count, error } = await supabase
      .from("maintenance_requests")
      .update({
        description: REDACTED_TEXT,
        notes: REDACTED_TEXT,
        metadata: withRedactionMetadata(null, "maintenance_requests"),
      })
      .or(`requested_by.eq.${tenantId},assigned_to.eq.${tenantId}`)
      .select("id", { count: "exact" })
    if (error) {
      throw new Error(`Unable to anonymise maintenance requests: ${error.message}`)
    }
    updates.maintenanceRequestsUpdated = count ?? 0
  }

  if (bundle.visitorLogs.length) {
    const { count, error } = await supabase
      .from("visitor_logs")
      .update({
        guest_name: REDACTED_VALUE,
        guest_email: REDACTED_VALUE,
        guest_phone: REDACTED_VALUE,
        emergency_contact: REDACTED_VALUE,
        special_notes: REDACTED_TEXT,
      })
      .eq("host_id", tenantId)
      .select("id", { count: "exact" })
    if (error) {
      throw new Error(`Unable to anonymise visitor logs: ${error.message}`)
    }
    updates.visitorLogsUpdated = count ?? 0
  }

  if (bundle.notifications.length) {
    const { count, error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", tenantId)
      .select("id", { count: "exact" })
    if (error) {
      throw new Error(`Unable to purge notifications: ${error.message}`)
    }
    updates.notificationsDeleted = count ?? 0
  }

  if (bundle.emailNotifications.length) {
    const emailClause = tenantEmailClause(bundle.profile?.email ?? null, tenantId)
    let deleteQuery = supabase.from("email_notifications").delete()

    if (emailClause.includes(",")) {
      deleteQuery = deleteQuery.or(emailClause)
    } else {
      deleteQuery = deleteQuery.eq("user_id", tenantId)
    }

    const { count, error } = await deleteQuery.select("id", { count: "exact" })
    if (error) {
      throw new Error(`Unable to purge email notifications: ${error.message}`)
    }
    updates.emailNotificationsDeleted = count ?? 0
  }

  return updates
}

function tenantEmailClause(email: string | null, tenantId: string): string {
  if (email) {
    return `user_id.eq.${tenantId},recipient.eq.${email}`
  }
  return `user_id.eq.${tenantId}`
}

export async function removeStripeCustomer(
  stripe: Stripe | null,
  customerId: string | null,
): Promise<void> {
  if (!stripe || !customerId) return
  await stripe.customers.del(customerId)
}

export async function cancelStripeSubscriptions(
  stripe: Stripe | null,
  subscriptionIds: string[],
): Promise<void> {
  if (!stripe) return
  for (const subscriptionId of subscriptionIds) {
    await stripe.subscriptions.del(subscriptionId)
  }
}

export interface DocumensoCleanupPayload {
  envelopeId: string
  recipientTokens?: string[]
}

export interface DocumensoClientLike {
  redactDocumentRecipients: (
    envelopeId: string,
    payload?: { recipientTokens?: string[] }
  ) => Promise<void>
  deleteDocument: (envelopeId: string) => Promise<void>
}

export async function cleanupDocumenso(
  client: DocumensoClientLike,
  payloads: DocumensoCleanupPayload[],
): Promise<void> {
  for (const payload of payloads) {
    if (!payload.envelopeId) continue
    try {
      await client.redactDocumentRecipients(payload.envelopeId, {
        recipientTokens: payload.recipientTokens,
      })
    } catch (error) {
      await client.deleteDocument(payload.envelopeId)
    }
  }
}

export interface CalComClientLike {
  deleteBooking: (bookingId: string) => Promise<void>
}

export async function cleanupCalComBookings(
  client: CalComClientLike,
  bookingIds: string[],
): Promise<void> {
  for (const bookingId of bookingIds) {
    if (!bookingId) continue
    await client.deleteBooking(bookingId)
  }
}
