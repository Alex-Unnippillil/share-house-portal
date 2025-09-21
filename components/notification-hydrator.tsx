"use client"

import { useEffect } from "react"

import { isStaffRole } from "@/lib/messages/permissions"
import { pushNotification } from "@/lib/notifications/store"
import type { MessageRow, TenantRole } from "@/types/messages"
import useSupabaseBrowser from "@/utils/supabase-browser"

const NotificationHydrator = () => {
  const supabase = useSupabaseBrowser()

  useEffect(() => {
    let cancelled = false
    const setup = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || cancelled) {
        return
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, role, building_id, unit_id")
        .eq("id", user.id)
        .single()
      if (!profile || !profile.building_id || cancelled) {
        return
      }

      const filter = `building_id=eq.${profile.building_id}`
      const allowMessage = (message?: Partial<MessageRow> | null) => {
        if (!message) {
          return false
        }
        if (isStaffRole(profile.role as TenantRole)) {
          return true
        }
        return !message.unit_id || message.unit_id === profile.unit_id
      }

      const channel = supabase
        .channel(`notifications:${profile.building_id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter },
          (payload) => {
            const message = payload.new as MessageRow
            if (!allowMessage(message)) {
              return
            }
            pushNotification({
              id: message.id,
              type: "message:new",
              title: message.message_type === "poll" ? "New poll" : "New message",
              description: message.content?.slice(0, 160),
              createdAt: message.created_at,
              link: `/dashboard/messages?thread=${message.thread_id}`,
              status: message.status,
              threadId: message.thread_id,
              messageId: message.id,
            })
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "messages", filter },
          (payload) => {
            const message = payload.new as MessageRow
            const previous = payload.old as MessageRow | null
            if (!allowMessage(message)) {
              return
            }
            if (previous && message.status !== previous.status) {
              const statusId = `${message.id}:${message.status}`
              pushNotification({
                id: statusId,
                type: "message:moderated",
                title: `Message ${message.status}`,
                description: message.content?.slice(0, 160),
                createdAt: message.updated_at ?? message.created_at,
                link: `/dashboard/messages?thread=${message.thread_id}&message=${message.id}`,
                status: message.status,
                threadId: message.thread_id,
                messageId: message.id,
              })
              if (message.status === "flagged") {
                pushNotification({
                  id: `${statusId}:maintenance`,
                  type: "maintenance:update",
                  title: "Maintenance follow-up flagged",
                  description: message.content?.slice(0, 160),
                  createdAt: message.updated_at ?? message.created_at,
                  link: `/dashboard/messages?thread=${message.thread_id}&message=${message.id}`,
                  status: message.status,
                  threadId: message.thread_id,
                  messageId: message.id,
                })
              }
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "message_moderation", filter },
          (payload) => {
            const moderation = payload.new as { message_id: string; thread_id: string; action: string; created_at: string; reason?: string | null }
            pushNotification({
              id: `${moderation.message_id}:${moderation.created_at}:${moderation.action}`,
              type: "message:moderated",
              title: `Message ${moderation.action}`,
              description: moderation.reason ?? undefined,
              createdAt: moderation.created_at,
              link: `/dashboard/messages?thread=${moderation.thread_id}&message=${moderation.message_id}`,
              status: moderation.action,
              threadId: moderation.thread_id,
              messageId: moderation.message_id,
              metadata: { action: moderation.action, reason: moderation.reason },
            })
          }
        )

      const subscription = channel.subscribe()

      return () => {
        supabase.removeChannel(channel)
        subscription.unsubscribe?.()
      }
    }

    const teardown = setup()

    return () => {
      cancelled = true
      teardown.then((cleanup) => {
        if (typeof cleanup === "function") {
          cleanup()
        }
      })
    }
  }, [supabase])

  return null
}

export default NotificationHydrator
