"use client"

import { useCallback, useEffect, useState } from "react"

import { CsatPrompt } from "@/components/feedback/CsatPrompt"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { canShowCsatPrompt } from "@/lib/feedback/client"
import useSupabaseBrowser from "@/utils/supabase-browser"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"
import type { MaintenanceTicket } from "../data"
import { toast } from "sonner"

const statusLabels: Record<
  MaintenanceTicket['status'] | 'completed',
  string
> = {
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  awaiting_vendor: 'Awaiting vendor',
  completed: 'Completed',
}

const priorityVariants: Record<
  MaintenanceTicket['priority'],
  'outline' | 'secondary' | 'destructive'
> = {
  low: 'outline',
  medium: 'secondary',
  high: 'destructive',
}

interface MaintenanceTicketItemProps {
  ticket: MaintenanceTicket
}

type CsatState = {
  open: boolean
  contextId: string
  entityName: string
}

export function MaintenanceTicketItem({ ticket }: MaintenanceTicketItemProps) {
  const supabase = useSupabaseBrowser()
  const client = supabase as unknown as TypedSupabaseClient
  const [status, setStatus] = useState<MaintenanceTicket['status'] | 'completed'>(
    ticket.status,
  )
  const [updatedAt, setUpdatedAt] = useState(ticket.updatedAt)
  const [userId, setUserId] = useState<string | null>(null)
  const [csatState, setCsatState] = useState<CsatState | null>(null)
  const [resolving, setResolving] = useState(false)

  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null))
      .catch((error) => {
        console.error('Unable to resolve user for maintenance CSAT prompt', error)
      })
  }, [supabase])

  const handleCsatOpenChange = useCallback((nextOpen: boolean) => {
    setCsatState((current) => (current ? { ...current, open: nextOpen } : current))
  }, [])

  const handleCsatClosed = useCallback(() => {
    setCsatState(null)
  }, [])

  const handleResolve = useCallback(async () => {
    if (status === 'completed' || resolving) {
      return
    }

    setResolving(true)

    try {
      const now = new Date()
      const nowIso = now.toISOString()

      const { error } = await client
        .from('maintenance_requests')
        .update({
          status: 'completed',
          completed_at: nowIso,
          updated_at: nowIso,
        })
        .eq('id', ticket.id)

      if (error) {
        throw error
      }

      setStatus('completed')
      setUpdatedAt(nowIso)
      toast.success('Maintenance request marked as resolved')

      if (userId) {
        const eligible = await canShowCsatPrompt(client, {
          userId,
          context: 'maintenance_resolved',
          contextId: ticket.id,
        })

        if (eligible) {
          setCsatState({
            open: true,
            contextId: ticket.id,
            entityName: ticket.title,
          })
        }
      }
    } catch (error) {
      console.error('Unable to mark maintenance resolved', error)
      toast.error('Unable to update maintenance request')
    } finally {
      setResolving(false)
    }
  }, [client, resolving, status, ticket.id, ticket.title, userId])

  const formattedDate = new Date(updatedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })

  return (
    <li className="rounded-lg border border-dashed border-border/70 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{ticket.title}</p>
          <p className="text-xs text-muted-foreground">
            Last updated {formattedDate}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={priorityVariants[ticket.priority]} className="uppercase">
            {ticket.priority} priority
          </Badge>
          <Badge variant="outline">{statusLabels[status]}</Badge>
        </div>
      </div>

      {status !== 'completed' ? (
        <div className="mt-3 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResolve}
            disabled={resolving || !userId}
          >
            {resolving ? 'Marking…' : 'Mark resolved'}
          </Button>
        </div>
      ) : null}

      {userId && csatState ? (
        <CsatPrompt
          open={csatState.open}
          onOpenChange={handleCsatOpenChange}
          onDismiss={handleCsatClosed}
          onSubmitted={handleCsatClosed}
          userId={userId}
          context="maintenance_resolved"
          contextId={csatState.contextId}
          entityName={csatState.entityName}
          metadata={{ maintenanceId: ticket.id, priority: ticket.priority }}
        />
      ) : null}
    </li>
  )
}
