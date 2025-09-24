"use server"

import { createHash } from "crypto"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { Resend } from "resend"

import type { Database, Tables } from "@/lib/supabase"
import { createSupbaseServerClient } from "@/utils/supaone"

export interface TenantNotificationContext {
  tenantId: string
  tenantName?: string
  fromLocalPart?: string
  fallbackFrom?: string
}

export interface NotificationData {
  to: string | string[]
  subject: string
  template: string
  data?: Record<string, any>
  userId?: string
  tenantContext?: TenantNotificationContext
}

export interface InAppNotification {
  userId: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  actionUrl?: string
  metadata?: Record<string, any>
}

type TenantDomainStatus = "pending" | "verified" | "failed" | "not_started"

type ResendDomainRecord = {
  record: "SPF" | "DKIM"
  name: string
  value: string
  type: string
  ttl: string
  status: string
}

type DomainSyncPayload = {
  status: TenantDomainStatus
  identityId: string | null
  spf: ResendDomainRecord
  dkim: ResendDomainRecord
  metadata?: Record<string, unknown> | null
}

const FALLBACK_SPF = "v=spf1 include:spf.resend.dev ~all"

class NotificationService {
  private resend: Resend | null = null
  private readonly defaultResend: Resend | null
  private supabaseFactory: () => Promise<SupabaseClient<Database>>
  private readonly defaultSupabaseFactory: () => Promise<SupabaseClient<Database>>
  private serviceSupabase: SupabaseClient<Database> | null = null
  private readonly defaultServiceSupabase: SupabaseClient<Database> | null

  constructor() {
    const apiKey = process.env.RESEND_API_KEY
    if (apiKey && apiKey !== "re_your_resend_api_key_here") {
      this.resend = new Resend(apiKey)
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (supabaseUrl && serviceRoleKey) {
      this.serviceSupabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    }

    this.defaultResend = this.resend
    this.supabaseFactory = createSupbaseServerClient
    this.defaultSupabaseFactory = createSupbaseServerClient
    this.defaultServiceSupabase = this.serviceSupabase
  }

  setTestOverrides(overrides: {
    supabaseFactory?: () => Promise<SupabaseClient<Database>>
    serviceSupabase?: SupabaseClient<Database> | null
    resend?: Resend | null
  }) {
    if (overrides.supabaseFactory) {
      this.supabaseFactory = overrides.supabaseFactory
    }
    if (overrides.serviceSupabase !== undefined) {
      this.serviceSupabase = overrides.serviceSupabase
    }
    if (overrides.resend !== undefined) {
      this.resend = overrides.resend
    }
  }

  resetTestOverrides() {
    this.supabaseFactory = this.defaultSupabaseFactory
    this.serviceSupabase = this.defaultServiceSupabase
    this.resend = this.defaultResend
  }

  private async getSupabaseClient(options?: { privileged?: boolean }) {
    if (options?.privileged) {
      if (this.serviceSupabase) {
        return this.serviceSupabase
      }
      console.warn(
        "Supabase service role key not configured. Falling back to session-scoped client."
      )
    }

    return this.supabaseFactory()
  }

  private ensureResendClient() {
    if (!this.resend) {
      throw new Error("Resend API key not configured")
    }

    return this.resend
  }

  private normalizeDomain(domain: string) {
    const normalized = domain.trim().toLowerCase().replace(/^[.]+|[.]+$/g, "")
    if (!normalized) {
      throw new Error("Domain is required")
    }

    return normalized
  }

  private buildFallbackRecords(
    tenantId: string,
    domain: string
  ): DomainSyncPayload {
    const hash = createHash("sha256")
      .update(`${tenantId}:${domain}`)
      .digest("hex")
    const selector = `roomsily-${hash.slice(0, 12)}`

    return {
      status: "pending",
      identityId: null,
      spf: {
        record: "SPF",
        name: "@",
        type: "TXT",
        value: FALLBACK_SPF,
        ttl: "300",
        status: "pending",
      },
      dkim: {
        record: "DKIM",
        name: `${selector}._domainkey`,
        type: "CNAME",
        value: `${selector}.dkim.roomsily.invalid`,
        ttl: "300",
        status: "pending",
      },
      metadata: { provider: "fallback" },
    }
  }

  private extractRecords(records: ResendDomainRecord[]) {
    const spf = records.find((record) => record.record === "SPF")
    const dkim = records.find((record) => record.record === "DKIM")

    if (!spf || !dkim) {
      throw new Error("Provider did not return SPF/DKIM records")
    }

    return { spf, dkim }
  }

  private async getTenantDomainRow(tenantId: string) {
    const supabase = await this.getSupabaseClient({ privileged: true })
    const { data, error } = await supabase
      .from("tenant_email_domains")
      .select("*")
      .eq("household_id", tenantId)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to load tenant domain: ${error.message}`)
    }

    return (data as Tables<'tenant_email_domains'> | null) ?? null
  }

  private async syncTenantDomain(
    tenantId: string,
    domain: string,
    payload: DomainSyncPayload
  ) {
    const supabase = await this.getSupabaseClient({ privileged: true })
    const now = new Date().toISOString()
    const existing = await this.getTenantDomainRow(tenantId)

    const updatePayload = {
      domain,
      status: payload.status,
      identity_id: payload.identityId,
      spf_name: payload.spf.name,
      spf_type: payload.spf.type,
      spf_value: payload.spf.value,
      dkim_name: payload.dkim.name,
      dkim_type: payload.dkim.type,
      dkim_value: payload.dkim.value,
      last_checked_at: now,
      verification_requested_at:
        existing?.verification_requested_at ?? now,
      verified_at:
        payload.status === "verified" ? now : existing?.verified_at ?? null,
      metadata: payload.metadata
        ? { ...(existing?.metadata ?? {}), ...payload.metadata }
        : existing?.metadata ?? null,
    }

    if (existing) {
      const { data, error } = await supabase
        .from("tenant_email_domains")
        .update(updatePayload)
        .eq("household_id", tenantId)
        .select("*")
        .single()

      if (error) {
        throw new Error(`Failed to update tenant domain: ${error.message}`)
      }

      return data as Tables<'tenant_email_domains'>
    }

    const { data, error } = await supabase
      .from("tenant_email_domains")
      .insert({
        household_id: tenantId,
        ...updatePayload,
      })
      .select("*")
      .single()

    if (error) {
      throw new Error(`Failed to create tenant domain: ${error.message}`)
    }

    return data as Tables<'tenant_email_domains'>
  }

  private async resolveProviderDomain(domain: string) {
    const resend = this.ensureResendClient()

    const listResponse = await resend.domains.list()
    if (listResponse.error) {
      throw new Error(`Failed to list domains: ${listResponse.error.message}`)
    }

    const existing = listResponse.data?.data?.find(
      (entry) => entry.name === domain
    )

    if (existing) {
      const details = await resend.domains.get(existing.id)
      if (details.error || !details.data) {
        throw new Error(
          details.error
            ? `Failed to load domain details: ${details.error.message}`
            : "Domain lookup returned no data"
        )
      }

      return details.data
    }

    const creation = await resend.domains.create({ name: domain })
    if (creation.error || !creation.data) {
      throw new Error(
        creation.error
          ? `Failed to create domain: ${creation.error.message}`
          : "Domain creation returned no data"
      )
    }

    const details = await resend.domains.get(creation.data.id)
    if (details.error || !details.data) {
      throw new Error(
        details.error
          ? `Failed to load created domain: ${details.error.message}`
          : "Domain creation lookup returned no data"
      )
    }

    return details.data
  }

  async ensureTenantDomainRecords(tenantId: string, domain: string) {
    const normalizedDomain = this.normalizeDomain(domain)

    if (!this.resend) {
      console.warn(
        "Resend API key not configured. Generating fallback DNS records."
      )
      const fallback = this.buildFallbackRecords(tenantId, normalizedDomain)
      return this.syncTenantDomain(tenantId, normalizedDomain, fallback)
    }

    const providerDomain = await this.resolveProviderDomain(normalizedDomain)
    const { spf, dkim } = this.extractRecords(
      providerDomain.records as ResendDomainRecord[]
    )

    return this.syncTenantDomain(tenantId, normalizedDomain, {
      status: providerDomain.status as TenantDomainStatus,
      identityId: providerDomain.id,
      spf,
      dkim,
      metadata: {
        provider: "resend",
        region: providerDomain.region,
      },
    })
  }

  async verifyTenantDomain(tenantId: string) {
    if (!this.resend) {
      throw new Error("Email provider not configured")
    }

    const existing = await this.getTenantDomainRow(tenantId)
    if (!existing) {
      throw new Error("Tenant does not have a configured domain")
    }

    const providerDomain = await this.resolveProviderDomain(existing.domain)

    const verifyResponse = await this.resend.domains.verify(providerDomain.id)
    if (verifyResponse.error) {
      throw new Error(
        `Failed to trigger verification: ${verifyResponse.error.message}`
      )
    }

    const refreshed = await this.resend.domains.get(providerDomain.id)
    if (refreshed.error || !refreshed.data) {
      throw new Error(
        refreshed.error
          ? `Failed to refresh domain: ${refreshed.error.message}`
          : "Domain verification lookup returned no data"
      )
    }

    const { spf, dkim } = this.extractRecords(
      refreshed.data.records as ResendDomainRecord[]
    )

    return this.syncTenantDomain(existing.household_id, existing.domain, {
      status: refreshed.data.status as TenantDomainStatus,
      identityId: refreshed.data.id,
      spf,
      dkim,
      metadata: {
        provider: "resend",
        region: refreshed.data.region,
      },
    })
  }

  async getTenantDomain(tenantId: string) {
    return this.getTenantDomainRow(tenantId)
  }

  private async buildFromAddress(
    notification: NotificationData,
    tenantDomain: Tables<'tenant_email_domains'> | null
  ) {
    const fallbackFrom =
      notification.tenantContext?.fallbackFrom ??
      "Roomsily <notifications@roomsily.com>"
    const displayName = notification.tenantContext?.tenantName ?? "Roomsily"
    const localPartRaw = notification.tenantContext?.fromLocalPart ?? "notices"
    const localPart = localPartRaw.replace(/[^a-zA-Z0-9._-]/g, "").toLowerCase()

    if (!tenantDomain || tenantDomain.status !== "verified") {
      return fallbackFrom
    }

    const safeLocalPart = localPart.length > 0 ? localPart : "notices"
    return `${displayName} <${safeLocalPart}@${tenantDomain.domain}>`
  }

  async sendEmail(notification: NotificationData) {
    if (!this.resend) {
      console.warn(
        "Resend API key not configured. Skipping email notification."
      )
      return { success: false, error: "Email service not configured" }
    }

    try {
      const recipients = Array.isArray(notification.to)
        ? notification.to
        : [notification.to]

      let tenantDomain: Tables<'tenant_email_domains'> | null = null
      if (notification.tenantContext?.tenantId) {
        try {
          tenantDomain = await this.getTenantDomain(
            notification.tenantContext.tenantId
          )
        } catch (tenantError) {
          console.error("Failed to load tenant domain", tenantError)
        }
      }

      const templateData = {
        ...notification.data,
        tenantDomain:
          tenantDomain?.status === "verified" ? tenantDomain.domain : undefined,
      }

      const emailTemplates = {
        "visitor-booking": this.getVisitorBookingTemplate,
        "maintenance-request": this.getMaintenanceRequestTemplate,
        "payment-receipt": this.getPaymentReceiptTemplate,
        "document-signed": this.getDocumentSignedTemplate,
        welcome: this.getWelcomeTemplate,
      }

      const templateFn =
        emailTemplates[notification.template as keyof typeof emailTemplates]

      if (!templateFn) {
        throw new Error(`Email template '${notification.template}' not found`)
      }

      const emailContent = templateFn.call(this, templateData)
      const fromAddress = await this.buildFromAddress(notification, tenantDomain)

      const { data, error } = await this.resend.emails.send({
        from: fromAddress,
        to: recipients,
        subject: notification.subject,
        html: emailContent,
      })

      if (error) {
        console.error("Failed to send email:", error)
        return { success: false, error: error.message }
      }

      if (notification.userId) {
        await this.storeEmailNotification(notification)
      }

      return { success: true, data }
    } catch (error) {
      console.error("Email sending error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async sendInAppNotification(notification: InAppNotification) {
    try {
      const supabase = await this.getSupabaseClient({ privileged: true })

      const { data, error } = await supabase
        .from("notifications")
        .insert({
          user_id: notification.userId,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          action_url: notification.actionUrl,
          metadata: notification.metadata,
          read: false,
          created_at: new Date().toISOString(),
        })
        .select("*")

      if (error) {
        console.error("Failed to create in-app notification:", error)
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error) {
      console.error("In-app notification error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async sendBulkNotification(
    notifications: (NotificationData | InAppNotification)[]
  ) {
    const results = await Promise.allSettled(
      notifications.map((notification) => {
        if ("to" in notification) {
          return this.sendEmail(notification)
        }
        return this.sendInAppNotification(notification)
      })
    )

    return results.map((result, index) => ({
      index,
      success: result.status === "fulfilled" ? result.value.success : false,
      error: result.status === "rejected" ? result.reason : result.value.error,
    }))
  }

  private async storeEmailNotification(notification: NotificationData) {
    try {
      const supabase = await this.getSupabaseClient({ privileged: true })

      await supabase.from("email_notifications").insert({
        user_id: notification.userId,
        recipient: Array.isArray(notification.to)
          ? notification.to.join(", ")
          : notification.to,
        subject: notification.subject,
        template: notification.template,
        status: "sent",
        sent_at: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Failed to store email notification:", error)
    }
  }

  private getVisitorBookingTemplate(data?: any) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Overnight Visitor Booking</h2>
        <p><strong>Guest:</strong> ${data?.guestName || "Unknown"}</p>
        <p><strong>Host:</strong> ${data?.hostName || "Unknown"}</p>
        <p><strong>Dates:</strong> ${
          data?.checkInDate || "Unknown"
        } to ${data?.checkOutDate || "Unknown"}</p>
        <p><strong>Purpose:</strong> ${data?.purpose || "Not specified"}</p>
        <p>Please review this booking request in the dashboard.</p>
        <a href="${
          process.env.NEXT_PUBLIC_APP_URL
        }/dashboard" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View in Dashboard</a>
        ${
          data?.tenantDomain
            ? `<p style="margin-top:24px;font-size:12px;color:#6b7280;">Sent from ${data.tenantDomain}</p>`
            : ""
        }
      </div>
    `
  }

  private getMaintenanceRequestTemplate(data?: any) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Maintenance Request</h2>
        <p><strong>Requested by:</strong> ${
          data?.requesterName || "Unknown"
        }</p>
        <p><strong>Issue:</strong> ${data?.title || "Unknown"}</p>
        <p><strong>Description:</strong> ${
          data?.description || "No description provided"
        }</p>
        <p><strong>Priority:</strong> ${data?.priority || "Normal"}</p>
        <a href="${
          process.env.NEXT_PUBLIC_APP_URL
        }/dashboard" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Request</a>
        ${
          data?.tenantDomain
            ? `<p style="margin-top:24px;font-size:12px;color:#6b7280;">Sent from ${data.tenantDomain}</p>`
            : ""
        }
      </div>
    `
  }

  private getPaymentReceiptTemplate(data?: any) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Payment Receipt</h2>
        <p><strong>Tenant:</strong> ${data?.tenantName || "Unknown"}</p>
        <p><strong>Amount:</strong> $${data?.amount || "0.00"}</p>
        <p><strong>Description:</strong> ${
          data?.description || "Rent payment"
        }</p>
        <p><strong>Date:</strong> ${
          data?.date || new Date().toLocaleDateString()
        }</p>
        <p>Thank you for your payment!</p>
        ${
          data?.tenantDomain
            ? `<p style="margin-top:24px;font-size:12px;color:#6b7280;">This receipt was sent from ${data.tenantDomain}</p>`
            : ""
        }
      </div>
    `
  }

  private getDocumentSignedTemplate(data?: any) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Document Signed</h2>
        <p><strong>Document:</strong> ${data?.documentTitle || "Unknown"}</p>
        <p><strong>Signed by:</strong> ${data?.signerName || "Unknown"}</p>
        <p><strong>Date:</strong> ${
          data?.signedAt || new Date().toLocaleDateString()
        }</p>
        <a href="${
          process.env.NEXT_PUBLIC_APP_URL
        }/documents" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Document</a>
        ${
          data?.tenantDomain
            ? `<p style="margin-top:24px;font-size:12px;color:#6b7280;">Delivered by ${data.tenantDomain}</p>`
            : ""
        }
      </div>
    `
  }

  private getWelcomeTemplate(data?: any) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Roomsily!</h2>
        <p>Hello ${data?.firstName || "there"}!</p>
        <p>Welcome to your Roomsily co-living hub. You can now:</p>
        <ul>
          <li>Manage your rent payments</li>
          <li>Book shared amenities</li>
          <li>Access important documents</li>
          <li>Communicate with roommates</li>
        </ul>
        <a href="${
          process.env.NEXT_PUBLIC_APP_URL
        }/dashboard" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Get Started</a>
        ${
          data?.tenantDomain
            ? `<p style="margin-top:24px;font-size:12px;color:#6b7280;">Powered by ${data.tenantDomain}</p>`
            : ""
        }
      </div>
    `
  }
}

const notificationService = new NotificationService()

export type TenantEmailDomain = Tables<'tenant_email_domains'>

export async function sendEmailNotification(notification: NotificationData) {
  return notificationService.sendEmail(notification)
}

export async function sendInAppNotification(notification: InAppNotification) {
  return notificationService.sendInAppNotification(notification)
}

export async function sendBulkNotifications(
  notifications: (NotificationData | InAppNotification)[]
) {
  return notificationService.sendBulkNotification(notifications)
}

export async function ensureTenantEmailDomainRecords(
  tenantId: string,
  domain: string
) {
  return notificationService.ensureTenantDomainRecords(tenantId, domain)
}

export async function verifyTenantEmailDomain(tenantId: string) {
  return notificationService.verifyTenantDomain(tenantId)
}

export async function getTenantEmailDomain(tenantId: string) {
  return notificationService.getTenantDomain(tenantId)
}

export function __setNotificationServiceTestOverrides(overrides: {
  supabaseFactory?: () => Promise<SupabaseClient<Database>>
  serviceSupabase?: SupabaseClient<Database> | null
  resend?: Resend | null
}) {
  notificationService.setTestOverrides(overrides)
}

export function __resetNotificationServiceTestOverrides() {
  notificationService.resetTestOverrides()
}
