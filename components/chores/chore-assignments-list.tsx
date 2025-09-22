'use client'

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ArrowLeftRight, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { proposeChoreSwap, respondToChoreSwap } from '@/app/chores/actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import type { Database } from '@/lib/supabase'
import { cn } from '@/lib/utils'

type ChoreAssignmentRow = Database['public']['Tables']['chore_assignments']['Row']
type ChoreSwapRow = Database['public']['Tables']['chore_swaps']['Row']

type Roommate = {
  id: string
  full_name: string | null
  avatar_url: string | null
}

export type AssignmentWithSwaps = ChoreAssignmentRow & {
  assignee: Roommate | null
  swaps: ChoreSwapRow[]
}

const statusConfigs: Record<ChoreAssignmentRow['status'], { label: string; className: string }> = {
  assigned: { label: 'Assigned', className: 'border border-blue-200 bg-blue-50 text-blue-700' },
  completed: { label: 'Completed', className: 'border border-emerald-200 bg-emerald-50 text-emerald-700' },
  skipped: { label: 'Skipped', className: 'border border-amber-200 bg-amber-50 text-amber-700' },
}

const getStatusConfig = (status: ChoreAssignmentRow['status']) => statusConfigs[status]

interface ChoreAssignmentsListProps {
  assignments: AssignmentWithSwaps[]
  roommates: Roommate[]
  currentUserId: string
}

interface ProcessingState {
  swapId: string
  response: 'accepted' | 'declined'
}

export function ChoreAssignmentsList({ assignments, roommates, currentUserId }: ChoreAssignmentsListProps) {
  const router = useRouter()
  const { toast } = useToast()

  const roommateMap = useMemo(() => new Map(roommates.map((roommate) => [roommate.id, roommate])), [roommates])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogAssignment, setDialogAssignment] = useState<AssignmentWithSwaps | null>(null)
  const [selectedResponderId, setSelectedResponderId] = useState('')
  const [swapMessage, setSwapMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [processing, setProcessing] = useState<ProcessingState | null>(null)

  const dialogEligibleResponders = useMemo(() => {
    if (!dialogAssignment) return [] as Roommate[]
    return roommates.filter(
      (roommate) => roommate.id !== dialogAssignment.assigned_to && roommate.id !== currentUserId
    )
  }, [dialogAssignment, roommates, currentUserId])

  const openSwapDialog = (assignment: AssignmentWithSwaps) => {
    setDialogAssignment(assignment)
    const firstEligible = roommates.find(
      (roommate) => roommate.id !== assignment.assigned_to && roommate.id !== currentUserId
    )
    setSelectedResponderId(firstEligible?.id ?? '')
    setSwapMessage('')
    setDialogOpen(true)
  }

  const closeSwapDialog = () => {
    setDialogOpen(false)
    setDialogAssignment(null)
    setSelectedResponderId('')
    setSwapMessage('')
  }

  const handleProposeSwap = async () => {
    if (!dialogAssignment || !selectedResponderId) return

    setIsSubmitting(true)
    const result = await proposeChoreSwap({
      assignmentId: dialogAssignment.id,
      responderId: selectedResponderId,
      message: swapMessage,
    })

    setIsSubmitting(false)

    if (!result.success) {
      toast({
        title: 'Unable to send swap request',
        description: result.error ?? 'Please try again.',
        variant: 'destructive',
      })
      return
    }

    toast({
      title: 'Swap request sent',
      description: 'Your roommate will be notified about the proposed swap.',
    })
    closeSwapDialog()
    router.refresh()
  }

  const handleRespond = async (swapId: string, response: 'accepted' | 'declined') => {
    setProcessing({ swapId, response })
    const result = await respondToChoreSwap({ swapId, response })
    setProcessing(null)

    if (!result.success) {
      toast({
        title: 'Unable to update swap',
        description: result.error ?? 'Please try again.',
        variant: 'destructive',
      })
      return
    }

    toast({
      title: response === 'accepted' ? 'Swap accepted' : 'Swap declined',
      description:
        response === 'accepted'
          ? 'The chore assignment has been updated and everyone has been notified.'
          : 'The requester has been notified of your decision.',
    })
    router.refresh()
  }

  const renderSwapMessage = (swap: ChoreSwapRow, type: 'incoming' | 'outgoing') => {
    const otherRoommateId = type === 'incoming' ? swap.requester_id : swap.responder_id
    const otherRoommate = roommateMap.get(otherRoommateId)
    const otherName = otherRoommate?.full_name || 'A roommate'

    if (swap.status === 'pending') {
      return type === 'incoming'
        ? `${otherName} asked to swap this chore with you.`
        : `Waiting for ${otherName} to respond to your swap request.`
    }

    if (swap.status === 'accepted') {
      return `${otherName} accepted this swap request.`
    }

    if (swap.status === 'declined') {
      return `${otherName} declined this swap request.`
    }

    return `${otherName} cancelled this swap request.`
  }

  if (assignments.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>No chore assignments yet</CardTitle>
          <CardDescription>
            When assignments are published for your unit they will show up here so you can collaborate with roommates.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {assignments.map((assignment) => {
        const isAssignee = assignment.assigned_to === currentUserId
        const assigneeName = assignment.assignee?.full_name || 'Unassigned'
        const formattedDate = assignment.scheduled_for
          ? format(new Date(assignment.scheduled_for), 'PPP')
          : 'No due date'

        const pendingIncoming = assignment.swaps.find(
          (swap) => swap.status === 'pending' && swap.responder_id === currentUserId
        )
        const pendingOutgoing = assignment.swaps.find(
          (swap) => swap.status === 'pending' && swap.requester_id === currentUserId
        )
        const availableResponders = roommates.filter(
          (roommate) => roommate.id !== assignment.assigned_to && roommate.id !== currentUserId
        )
        const latestCompletedSwap = [...assignment.swaps]
          .filter((swap) => swap.status !== 'pending')
          .sort((a, b) => {
            const dateA = new Date(a.responded_at ?? a.requested_at ?? '').getTime()
            const dateB = new Date(b.responded_at ?? b.requested_at ?? '').getTime()
            return dateB - dateA
          })[0]

        const statusConfig = getStatusConfig(assignment.status)

        const dialogIsOpen = dialogOpen && dialogAssignment?.id === assignment.id

        return (
          <Card key={assignment.id} className="shadow-sm">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <ArrowLeftRight className="hidden size-4 text-muted-foreground sm:inline" />
                  {assignment.title}
                </CardTitle>
                <CardDescription>Due {formattedDate}</CardDescription>
              </div>
              <Badge className={cn('self-start text-xs font-medium', statusConfig.className)}>
                {statusConfig.label}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="size-10">
                  {assignment.assignee?.avatar_url ? (
                    <AvatarImage src={assignment.assignee.avatar_url} alt={assigneeName} />
                  ) : (
                    <AvatarFallback>{assigneeName.charAt(0).toUpperCase()}</AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <p className="text-sm font-medium">
                    {assigneeName}
                    {isAssignee ? ' (You)' : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">Assigned roommate</p>
                </div>
              </div>

              {assignment.description && (
                <p className="text-sm text-muted-foreground">{assignment.description}</p>
              )}

              {pendingIncoming && (
                <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-3 text-sm">
                  <p className="font-medium">Swap request pending your response</p>
                  <p className="text-muted-foreground">{renderSwapMessage(pendingIncoming, 'incoming')}</p>
                  {pendingIncoming.message && (
                    <p className="mt-1 text-muted-foreground">“{pendingIncoming.message}”</p>
                  )}
                </div>
              )}

              {pendingOutgoing && (
                <div className="rounded-md border border-dashed border-muted-foreground/40 bg-muted/30 p-3 text-sm">
                  <p className="font-medium">Waiting for a roommate</p>
                  <p className="text-muted-foreground">{renderSwapMessage(pendingOutgoing, 'outgoing')}</p>
                  {pendingOutgoing.message && (
                    <p className="mt-1 text-muted-foreground">“{pendingOutgoing.message}”</p>
                  )}
                </div>
              )}

              {!pendingIncoming && !pendingOutgoing && latestCompletedSwap && (
                <div className="rounded-md border border-muted-foreground/30 bg-muted/20 p-3 text-sm">
                  <p className="font-medium">Recent swap update</p>
                  <p className="text-muted-foreground">
                    {renderSwapMessage(
                      latestCompletedSwap,
                      latestCompletedSwap.responder_id === currentUserId ? 'incoming' : 'outgoing'
                    )}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {isAssignee && !pendingOutgoing && availableResponders.length > 0 && (
                  <Dialog open={dialogIsOpen} onOpenChange={(open) => (!open ? closeSwapDialog() : null)}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => openSwapDialog(assignment)}>
                        Propose swap
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Propose a swap</DialogTitle>
                        <DialogDescription>
                          Choose a roommate to take over “{assignment.title}”. We will message them with your request.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <div className="space-y-2">
                          <Label htmlFor="swap-roommate">Roommate</Label>
                          <Select
                            value={selectedResponderId}
                            onValueChange={setSelectedResponderId}
                            disabled={dialogEligibleResponders.length === 0}
                          >
                            <SelectTrigger id="swap-roommate">
                              <SelectValue placeholder="Select a roommate" />
                            </SelectTrigger>
                            <SelectContent>
                              {dialogEligibleResponders.map((roommate) => (
                                <SelectItem key={roommate.id} value={roommate.id}>
                                  {roommate.full_name || 'Roommate'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="swap-message">Message (optional)</Label>
                          <Textarea
                            id="swap-message"
                            value={swapMessage}
                            onChange={(event) => setSwapMessage(event.target.value)}
                            placeholder="Share context or offer to cover another chore."
                            rows={3}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          type="button"
                          disabled={isSubmitting || !selectedResponderId}
                          onClick={handleProposeSwap}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 size-4 animate-spin" /> Sending
                            </>
                          ) : (
                            'Send request'
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}

                {pendingIncoming && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleRespond(pendingIncoming.id, 'accepted')}
                      disabled={processing?.swapId === pendingIncoming.id}
                    >
                      {processing?.swapId === pendingIncoming.id && processing.response === 'accepted' ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" /> Accepting
                        </>
                      ) : (
                        'Accept'
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRespond(pendingIncoming.id, 'declined')}
                      disabled={processing?.swapId === pendingIncoming.id}
                    >
                      {processing?.swapId === pendingIncoming.id && processing.response === 'declined' ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" /> Declining
                        </>
                      ) : (
                        'Decline'
                      )}
                    </Button>
                  </div>
                )}

                {isAssignee && availableResponders.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Invite more roommates to your unit to enable swaps.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
