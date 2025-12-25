"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import {
  ensureTenantEmailDomainRecords,
  verifyTenantEmailDomain,
} from "@/lib/notifications"

const domainSchema = z.object({
  tenantId: z.string().min(1, "Tenant is required"),
  domain: z
    .string({ required_error: "Domain is required" })
    .min(3, "Domain is required")
    .trim(),
})

const verifySchema = z.object({
  tenantId: z.string().min(1, "Tenant is required"),
})

export type DomainActionState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string }

export const initialDomainActionState: DomainActionState = { status: "idle" }

export async function upsertTenantEmailDomainAction(
  _prevState: DomainActionState,
  formData: FormData
): Promise<DomainActionState> {
  const result = domainSchema.safeParse({
    tenantId: formData.get("tenantId"),
    domain: formData.get("domain"),
  })

  if (!result.success) {
    const message =
      result.error.issues[0]?.message ?? "Unable to generate DNS records"
    return { status: "error", message }
  }

  try {
    await ensureTenantEmailDomainRecords(
      result.data.tenantId,
      result.data.domain
    )
    revalidatePath("/dashboard/email-domains")
    return {
      status: "success",
      message: "DNS records generated. Add them to your DNS host to continue.",
    }
  } catch (error) {
    console.error("Failed to ensure tenant domain records", error)
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Unable to generate DNS records",
    }
  }
}

export async function verifyTenantEmailDomainAction(
  _prevState: DomainActionState,
  formData: FormData
): Promise<DomainActionState> {
  const result = verifySchema.safeParse({
    tenantId: formData.get("tenantId"),
  })

  if (!result.success) {
    return {
      status: "error",
      message: result.error.issues[0]?.message ?? "Invalid tenant",
    }
  }

  try {
    const record = await verifyTenantEmailDomain(result.data.tenantId)
    revalidatePath("/dashboard/email-domains")
    const verified = record.status === "verified"
    return {
      status: "success",
      message: verified
        ? "Domain verified successfully."
        : "Verification check complete. DNS records are still pending.",
    }
  } catch (error) {
    console.error("Failed to verify tenant domain", error)
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Unable to verify domain",
    }
  }
}
