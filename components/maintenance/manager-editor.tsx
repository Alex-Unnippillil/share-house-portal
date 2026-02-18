'use client'

import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Database } from '@/lib/supabase'

type MaintenanceRequestRow = Database['public']['Tables']['maintenance_requests']['Row']
type MaintenanceUpdateRow = Database['public']['Tables']['maintenance_request_updates']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']

const statusOptions = ['pending', 'in_progress', 'completed', 'cancelled'] as const
const priorityOptions = ['low', 'normal', 'high', 'urgent'] as const

type RequestWithRequester = MaintenanceRequestRow & {
  requester: Pick<ProfileRow, 'id' | 'email' | 'full_name'> | null
}

type UpdateWithActor = MaintenanceUpdateRow & {
  actor: Pick<ProfileRow, 'id' | 'email' | 'full_name'> | null
  assignee: Pick<ProfileRow, 'id' | 'email' | 'full_name'> | null
}

export function ManagerEditor({
  request,
  managers,
  updates,
  disabled,
  onSave,
}: {
  request: RequestWithRequester
  managers: Pick<ProfileRow, 'id' | 'full_name' | 'email'>[]
  updates: UpdateWithActor[]
  disabled: boolean
  onSave: (changes: Partial<MaintenanceRequestRow>, comment?: string) => Promise<void>
}) {
  const [status, setStatus] = useState(request.status)
  const [priority, setPriority] = useState(request.priority)
  const [assignee, setAssignee] = useState(request.assigned_to ?? 'unassigned')
  const [comment, setComment] = useState('')

  useEffect(() => {
    setStatus(request.status)
    setPriority(request.priority)
    setAssignee(request.assigned_to ?? 'unassigned')
    setComment('')
  }, [request])

  return (
    <div className="space-y-4">
      <div>
        <p className="font-medium">{request.title}</p>
        <p className="text-sm text-muted-foreground">{request.description}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((value) => (
                <SelectItem key={value} value={value}>
                  {value.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={(value) => setPriority(value as typeof priority)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {priorityOptions.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Assign to</Label>
        <Select value={assignee} onValueChange={setAssignee}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {managers.map((manager) => (
              <SelectItem key={manager.id} value={manager.id}>
                {manager.full_name ?? manager.email ?? 'Unknown'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Manager note</Label>
        <Textarea
          placeholder="Add timeline update, vendor note, or next action."
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
      </div>

      <Button
        disabled={disabled}
        onClick={() =>
          onSave(
            {
              status,
              priority,
              assigned_to: assignee === 'unassigned' ? null : assignee,
              acknowledged_at: status !== 'pending' ? new Date().toISOString() : null,
              resolved_at: status === 'completed' ? new Date().toISOString() : null,
              completed_at: status === 'completed' ? new Date().toISOString() : null,
            },
            comment || undefined
          )
        }
      >
        {disabled ? 'Saving…' : 'Save triage changes'}
      </Button>

      <div className="space-y-2 pt-2">
        <p className="text-sm font-medium">Recent timeline events</p>
        {updates.slice(0, 6).map((event) => (
          <div key={event.id} className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{event.event_type.replace('_', ' ')}</span>
            {event.message ? ` — ${event.message}` : ''}
            {event.actor?.full_name ? ` by ${event.actor.full_name}` : ''}
          </div>
        ))}
      </div>
    </div>
  )
}
