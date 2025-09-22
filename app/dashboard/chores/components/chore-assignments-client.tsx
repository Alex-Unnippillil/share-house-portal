"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { format } from "date-fns"
import { CheckCircle2, CircleDot, UploadCloud, XCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import type { Database } from "@/lib/supabase"
import useSupabaseBrowser from "@/utils/supabase-browser"

import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

type ChoreAssignment = Database["public"]["Tables"]["chore_assignments"]["Row"]
type ChoreStatus = Database["public"]["Enums"]["chore_assignment_status"]

type Props = {
  initialAssignments: ChoreAssignment[]
  tenantId: string
}

type RealtimePayload = {
  eventType: "INSERT" | "UPDATE" | "DELETE"
  new: ChoreAssignment
  old: ChoreAssignment
}

const statusOrder: ChoreStatus[] = ["pending", "completed", "approved", "rejected"]

const statusLabels: Record<ChoreStatus, string> = {
  pending: "Pending",
  completed: "Completed",
  approved: "Approved",
  rejected: "Rejected",
}

const statusStyles: Record<ChoreStatus, string> = {
  pending:
    "border-amber-200 bg-amber-100 text-amber-900 dark:border-amber-400/30 dark:bg-amber-900/30 dark:text-amber-200",
  completed:
    "border-blue-200 bg-blue-100 text-blue-900 dark:border-blue-400/30 dark:bg-blue-900/30 dark:text-blue-200",
  approved:
    "border-emerald-200 bg-emerald-100 text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-900/30 dark:text-emerald-200",
  rejected:
    "border-rose-200 bg-rose-100 text-rose-900 dark:border-rose-400/30 dark:bg-rose-900/30 dark:text-rose-200",
}

const proofBucket = "chore-proofs"

function sortAssignments(assignments: ChoreAssignment[]): ChoreAssignment[] {
  return [...assignments].sort((a, b) => {
    const dueA = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY
    const dueB = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY

    if (Number.isNaN(dueA) && Number.isNaN(dueB)) {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    }

    if (Number.isNaN(dueA)) return 1
    if (Number.isNaN(dueB)) return -1

    if (dueA === dueB) {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    }

    return dueA - dueB
  })
}

function formatDate(value: string | null, fallback?: string) {
  if (!value) return fallback ?? null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return fallback ?? null
  }
  return format(parsed, "MMM d, yyyy")
}

function formatDateTime(value: string | null) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return format(parsed, "MMM d, yyyy 'at' p")
}

function getPublicProofUrl(client: TypedSupabaseClient, path: string) {
  return client.storage.from(proofBucket).getPublicUrl(path).data.publicUrl
}

export default function ChoreAssignmentsClient({ initialAssignments, tenantId }: Props) {
  const supabase = useSupabaseBrowser()
  const [assignments, setAssignments] = useState<ChoreAssignment[]>(() => sortAssignments(initialAssignments))
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    setAssignments(sortAssignments(initialAssignments))
  }, [initialAssignments])

  const statusSummary = useMemo(() => {
    return statusOrder.map((status) => ({
      status,
      count: assignments.filter((assignment) => assignment.status === status).length,
    }))
  }, [assignments])

  const proofUrls = useMemo(() => {
    const urls: Record<string, string> = {}

    assignments.forEach((assignment) => {
      if (assignment.proof_url) {
        urls[assignment.id] = getPublicProofUrl(supabase, assignment.proof_url)
      }
    })

    return urls
  }, [assignments, supabase])

  const upsertAssignment = useCallback((updated: ChoreAssignment) => {
    setAssignments((current) => {
      const next = [...current]
      const index = next.findIndex((item) => item.id === updated.id)

      if (index === -1) {
        next.push(updated)
      } else {
        next[index] = updated
      }

      return sortAssignments(next)
    })
  }, [])

  const removeAssignment = useCallback((removed: ChoreAssignment) => {
    setAssignments((current) => current.filter((item) => item.id !== removed.id))
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel(`chore-assignments-${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chore_assignments",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const data = payload as unknown as RealtimePayload

          if (data.eventType === "DELETE") {
            removeAssignment(data.old)
            return
          }

          upsertAssignment(data.new)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [removeAssignment, supabase, tenantId, upsertAssignment])

  const handleToggleCompletion = useCallback(
    async (assignment: ChoreAssignment) => {
      const isCompleted = assignment.status === "completed" || assignment.status === "approved"
      const nextStatus: ChoreStatus = isCompleted ? "pending" : "completed"
      const completedAt = isCompleted ? null : new Date().toISOString()

      setUpdatingId(assignment.id)

      const { error } = await supabase
        .from("chore_assignments")
        .update({ status: nextStatus, completed_at: completedAt })
        .eq("id", assignment.id)

      if (error) {
        console.error("Failed to toggle chore assignment", error)
        toast({
          title: "Something went wrong",
          description: "We couldn't update the chore status. Please try again.",
          variant: "destructive",
        })
      } else {
        upsertAssignment({ ...assignment, status: nextStatus, completed_at: completedAt })
        toast({
          title: isCompleted ? "Marked as not done" : "Chore completed",
          description: isCompleted
            ? "The chore has been moved back to pending."
            : "Nice work! We'll let everyone know this chore is complete.",
        })
      }

      setUpdatingId(null)
    },
    [supabase, upsertAssignment],
  )

  const handleUploadProof = useCallback(
    async (assignment: ChoreAssignment, file: File) => {
      setUploadingId(assignment.id)

      const path = `${assignment.id}/${Date.now()}-${file.name}`

      const { error: uploadError } = await supabase.storage.from(proofBucket).upload(path, file, {
        upsert: true,
        cacheControl: "3600",
      })

      if (uploadError) {
        console.error("Failed to upload chore proof", uploadError)
        toast({
          title: "Upload failed",
          description: "We couldn't upload your proof image. Please try again.",
          variant: "destructive",
        })
        setUploadingId(null)
        return
      }

      const completedAt = new Date().toISOString()

      const { error: updateError } = await supabase
        .from("chore_assignments")
        .update({
          proof_url: path,
          status: "completed",
          completed_at: completedAt,
        })
        .eq("id", assignment.id)

      if (updateError) {
        console.error("Failed to update chore after proof upload", updateError)
        toast({
          title: "Couldn't save proof",
          description: "Your file uploaded but we couldn't link it to the chore. Please try again.",
          variant: "destructive",
        })
      } else {
        const updated: ChoreAssignment = {
          ...assignment,
          proof_url: path,
          status: "completed",
          completed_at: completedAt,
        }
        upsertAssignment(updated)
        toast({
          title: "Proof uploaded",
          description: "Your photo is ready for review.",
        })
      }

      setUploadingId(null)
    },
    [supabase, upsertAssignment],
  )

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statusSummary.map(({ status, count }) => (
          <Card key={status} className="border-dashed">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{statusLabels[status]}</CardTitle>
              {status === "approved" ? (
                <CheckCircle2 className="size-4 text-emerald-500" />
              ) : status === "rejected" ? (
                <XCircle className="size-4 text-rose-500" />
              ) : (
                <CircleDot className="size-4 text-muted-foreground" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{count}</div>
              <p className="text-xs text-muted-foreground">Assignments marked as {statusLabels[status].toLowerCase()}.</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {assignments.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>No chores assigned yet</CardTitle>
            <CardDescription>
              When your property manager assigns a chore you&apos;ll see it here with the option to mark it complete or upload a proof photo.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {assignments.map((assignment) => {
            const isCompleted = assignment.status === "completed" || assignment.status === "approved"
            const proofUrl = assignment.proof_url ? proofUrls[assignment.id] : null

            return (
              <Card key={assignment.id} className="flex h-full flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-semibold leading-tight">
                        {assignment.chore_title}
                      </CardTitle>
                      <CardDescription>
                        {assignment.due_date
                          ? `Due ${formatDate(assignment.due_date)}`
                          : "No due date provided"}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={cn("border text-xs font-semibold uppercase", statusStyles[assignment.status])}>
                        {statusLabels[assignment.status]}
                      </Badge>
                      {assignment.point_awarded ? (
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-300">
                          +{assignment.points ?? 0} pts awarded
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Worth {assignment.points ?? 0} pts</span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  {assignment.description && <p>{assignment.description}</p>}

                  {assignment.completed_at && (
                    <p className="text-xs">
                      Marked complete {formatDateTime(assignment.completed_at) ?? "recently"}
                    </p>
                  )}

                  {proofUrl && (
                    <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3 text-xs">
                      <span className="font-medium text-muted-foreground">Proof uploaded</span>
                      <a
                        href={proofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-primary hover:underline"
                      >
                        View file
                      </a>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="mt-auto flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => handleToggleCompletion(assignment)}
                    disabled={updatingId === assignment.id}
                    variant={isCompleted ? "secondary" : "default"}
                  >
                    {updatingId === assignment.id
                      ? "Saving..."
                      : isCompleted
                        ? "Mark as not done"
                        : "Mark complete"}
                  </Button>

                  <div>
                    <input
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) {
                          void handleUploadProof(assignment, file)
                        }
                        event.target.value = ""
                      }}
                      ref={(element) => {
                        fileInputs.current[assignment.id] = element
                      }}
                      type="file"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputs.current[assignment.id]?.click()}
                      disabled={uploadingId === assignment.id}
                    >
                      {uploadingId === assignment.id ? (
                        "Uploading..."
                      ) : assignment.proof_url ? (
                        "Replace proof"
                      ) : (
                        <span className="flex items-center gap-2">
                          <UploadCloud className="size-4" />
                          Upload proof
                        </span>
                      )}
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
