"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import useSupabaseBrowser from "@/utils/supabase-browser"

import type { AccountNotificationPreferences } from "./types"

interface NotificationPreferencesFormProps {
  userId: string
  initialPreferences: AccountNotificationPreferences
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export default function NotificationPreferencesForm({
  userId,
  initialPreferences,
}: NotificationPreferencesFormProps) {
  const supabase = useSupabaseBrowser()
  const { toast } = useToast()
  const [formState, setFormState] = useState(initialPreferences)
  const [isSaving, setIsSaving] = useState(false)
  const [isPushSyncing, setIsPushSyncing] = useState(false)
  const [supportsPush, setSupportsPush] = useState(false)

  const vapidPublicKey = useMemo(
    () => process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY ?? "",
    [],
  )

  useEffect(() => {
    if (typeof window === "undefined") {
      setSupportsPush(false)
      return
    }
    const hasSupport =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    setSupportsPush(hasSupport)
  }, [])

  const updateField = <K extends keyof AccountNotificationPreferences>(
    field: K,
    value: AccountNotificationPreferences[K],
  ) => {
    setFormState((previous) => ({ ...previous, [field]: value }))
  }

  const ensurePushSubscription = useCallback(async () => {
    if (typeof window === "undefined") {
      toast({
        title: "Push not available",
        description: "Push notifications are only supported in the browser.",
        variant: "destructive",
      })
      return null
    }

    if (!supportsPush) {
      toast({
        title: "Push not supported",
        description: "This browser does not support push notifications.",
        variant: "destructive",
      })
      return null
    }

    if (!vapidPublicKey) {
      toast({
        title: "Push not configured",
        description: "Web push keys are missing. Contact your administrator.",
        variant: "destructive",
      })
      return null
    }

    if (typeof Notification === "undefined") {
      toast({
        title: "Push not supported",
        description: "This browser does not support notifications.",
        variant: "destructive",
      })
      return null
    }

    const permission = await Notification.requestPermission()
    if (permission !== "granted") {
      toast({
        title: "Permission required",
        description: "Push notifications require notification permission.",
        variant: "destructive",
      })
      return null
    }

    try {
      let registration = await navigator.serviceWorker.getRegistration()
      if (!registration) {
        registration = await navigator.serviceWorker.register("/sw.js")
      }

      if (!registration) {
        toast({
          title: "Registration failed",
          description: "We could not register the push service worker.",
          variant: "destructive",
        })
        return null
      }

      let subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        })
      }

      return subscription.toJSON()
    } catch (error) {
      console.error("Failed to create push subscription", error)
      toast({
        title: "Push setup failed",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred while enabling push notifications.",
        variant: "destructive",
      })
      return null
    }
  }, [supportsPush, toast, vapidPublicKey])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (formState.smsEnabled && !formState.smsPhoneNumber) {
      toast({
        title: "Phone number required",
        description: "Add a mobile number to receive text alerts.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    let pushSubscription = formState.pushSubscription

    try {
      if (formState.pushEnabled) {
        setIsPushSyncing(true)
        const subscription = await ensurePushSubscription()
        setIsPushSyncing(false)

        if (!subscription) {
          setIsSaving(false)
          return
        }

        pushSubscription = subscription
      } else if (typeof window !== "undefined" && supportsPush) {
        const registration = await navigator.serviceWorker.getRegistration()
        const activeSubscription = await registration?.pushManager.getSubscription()
        if (activeSubscription) {
          await activeSubscription.unsubscribe().catch(() => undefined)
        }
        pushSubscription = null
      }

      const { error } = await supabase
        .from("notification_preferences")
        .upsert(
          {
            user_id: userId,
            email_enabled: formState.emailEnabled,
            sms_enabled: formState.smsEnabled,
            push_enabled: formState.pushEnabled,
            sms_phone_number: formState.smsPhoneNumber || null,
            push_subscription: pushSubscription,
          },
          { onConflict: "user_id" }
        )

      if (error) {
        throw error
      }

      setFormState((previous) => ({
        ...previous,
        smsPhoneNumber: formState.smsPhoneNumber,
        emailEnabled: formState.emailEnabled,
        smsEnabled: formState.smsEnabled,
        pushEnabled: formState.pushEnabled,
        pushSubscription,
      }))

      toast({
        title: "Notification preferences updated",
        description: "We'll use your latest contact preferences from now on.",
      })
    } catch (error) {
      console.error("Failed to update notification preferences", error)
      toast({
        title: "Unable to update preferences",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred while saving your preferences.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
      setIsPushSyncing(false)
    }
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">Notification channels</h2>
        <p className="text-sm text-muted-foreground">
          Fine-tune how we reach you for payments, bookings, and documents. You can
          opt out of any channel at any time.
        </p>
      </div>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4 rounded-md border p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Email</p>
              <p className="text-sm text-muted-foreground">
                Receive full summaries, receipts, and booking confirmations in your inbox.
              </p>
            </div>
            <Switch
              id="email-enabled"
              checked={formState.emailEnabled}
              onCheckedChange={(checked) => updateField("emailEnabled", checked)}
            />
          </div>
          <div className="flex flex-col gap-4 rounded-md border p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Text messages</p>
                <p className="text-sm text-muted-foreground">
                  Get quick SMS alerts for time-sensitive updates like maintenance or visitors.
                </p>
              </div>
              <Switch
                id="sms-enabled"
                checked={formState.smsEnabled}
                onCheckedChange={(checked) => updateField("smsEnabled", checked)}
              />
            </div>
            <div>
              <label
                className="text-sm font-medium leading-none"
                htmlFor="sms-phone"
              >
                Mobile number
              </label>
              <Input
                id="sms-phone"
                type="tel"
                placeholder="+1 555-123-4567"
                value={formState.smsPhoneNumber ?? ""}
                onChange={(event) => updateField("smsPhoneNumber", event.target.value)}
                aria-describedby="sms-helper"
              />
              <p id="sms-helper" className="mt-1 text-xs text-muted-foreground">
                Standard carrier rates may apply.
              </p>
            </div>
          </div>
          <div className="flex items-start justify-between gap-4 rounded-md border p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Push notifications</p>
              <p className="text-sm text-muted-foreground">
                Enable browser push notifications for instant updates even when the app is closed.
              </p>
              {!supportsPush || !vapidPublicKey ? (
                <p className="text-xs text-muted-foreground">
                  Push notifications require a compatible browser and configured web push keys.
                </p>
              ) : null}
            </div>
            <Switch
              id="push-enabled"
              checked={formState.pushEnabled && supportsPush && Boolean(vapidPublicKey)}
              disabled={!supportsPush || !vapidPublicKey || isPushSyncing}
              onCheckedChange={(checked) => updateField("pushEnabled", checked)}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={isSaving || isPushSyncing}>
            {isSaving ? "Saving preferences..." : "Save preferences"}
          </Button>
          {isPushSyncing ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span>Updating push subscription…</span>
            </div>
          ) : null}
        </div>
      </form>
    </section>
  )
}
