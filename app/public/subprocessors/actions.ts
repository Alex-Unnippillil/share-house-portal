"use server"

import { revalidatePath } from "next/cache"
import { ZodError } from "zod"

import {
  subscribeEmailToSubprocessorUpdates,
  unsubscribeEmailFromSubprocessorUpdates,
} from "@/lib/compliance/subprocessors"

export type SubscriptionActionInput = {
  email: string
}

export type SubscriptionActionResponse = {
  success: boolean
  message: string
}

const ROUTE_PATH = "/public/subprocessors"

export async function subscribeSubprocessorUpdates(
  input: SubscriptionActionInput
): Promise<SubscriptionActionResponse> {
  try {
    const record = await subscribeEmailToSubprocessorUpdates(input.email)
    revalidatePath(ROUTE_PATH)

    return {
      success: true,
      message:
        record.status === "active" && !record.unsubscribed_at
          ? "You're subscribed to Roomsily subprocessor updates."
          : "Subscription preferences were refreshed.",
    }
  } catch (error) {
    if (error instanceof ZodError) {
      const issue = error.issues.at(0)?.message ?? "Enter a valid email address."
      return { success: false, message: issue }
    }

    console.error("Subscribe subprocessor updates error", error)
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to subscribe right now. Please try again soon.",
    }
  }
}

export async function unsubscribeSubprocessorUpdates(
  input: SubscriptionActionInput
): Promise<SubscriptionActionResponse> {
  try {
    const record = await unsubscribeEmailFromSubprocessorUpdates(input.email)
    revalidatePath(ROUTE_PATH)

    if (!record) {
      return {
        success: true,
        message: "We couldn't find an active subscription, but no further notices will be sent.",
      }
    }

    const alreadyUnsubscribed = record.status === "unsubscribed" && !!record.unsubscribed_at

    return {
      success: true,
      message: alreadyUnsubscribed
        ? "You're already unsubscribed from compliance notifications."
        : "You'll no longer receive subprocessor change emails.",
    }
  } catch (error) {
    if (error instanceof ZodError) {
      const issue = error.issues.at(0)?.message ?? "Enter a valid email address."
      return { success: false, message: issue }
    }

    console.error("Unsubscribe subprocessor updates error", error)
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to update your subscription right now.",
    }
  }
}
