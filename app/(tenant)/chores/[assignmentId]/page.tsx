import { notFound } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Database } from '@/lib/supabase'
import { createSupbaseServerClient } from '@/utils/supaone'

import { CompleteChoreForm } from './completion-form'

type PageProps = {
  params: {
    assignmentId: string
  }
}

type ChoreAssignment = Database['public']['Tables']['chore_assignments']['Row']

function formatDate(value: string | null) {
  if (!value) {
    return null
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function statusLabel(status: ChoreAssignment['status']) {
  switch (status) {
    case 'completed':
      return 'Completed'
    case 'in_progress':
      return 'In progress'
    default:
      return 'Assigned'
  }
}

export default async function ChoreCompletionPage({ params }: PageProps) {
  const supabase = await createSupbaseServerClient()
  const { data: assignment, error } = await supabase
    .from('chore_assignments')
    .select('id, title, description, status, credit_value, proof_url, due_date, completed_at')
    .eq('id', params.assignmentId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!assignment) {
    notFound()
  }

  const bucket = 'docs'
  let proofPublicUrl: string | null = null

  if (assignment.proof_url) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(assignment.proof_url)
    proofPublicUrl = data.publicUrl
  }

  const dueDateLabel = formatDate(assignment.due_date)
  const completedDateLabel = formatDate(assignment.completed_at)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{assignment.title}</CardTitle>
              {assignment.description ? (
                <CardDescription>{assignment.description}</CardDescription>
              ) : null}
            </div>
            <Badge
              variant={assignment.status === 'completed' ? 'secondary' : 'outline'}
              className={assignment.status === 'completed' ? 'bg-emerald-100 text-emerald-900' : ''}
            >
              {statusLabel(assignment.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {dueDateLabel ? <p>Due {dueDateLabel}</p> : null}
          {completedDateLabel ? <p>Completed {completedDateLabel}</p> : null}
          {assignment.credit_value ? (
            <p>
              Worth <span className="font-medium text-foreground">{assignment.credit_value}</span> credits
            </p>
          ) : null}
          {assignment.proof_url && proofPublicUrl ? (
            <p>
              Proof on file:{' '}
              <a className="text-primary underline" href={proofPublicUrl} rel="noreferrer" target="_blank">
                View proof
              </a>
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Submit completion</CardTitle>
          <CardDescription>
            Upload optional proof and confirm completion to update your household credits.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CompleteChoreForm
            assignmentId={assignment.id}
            status={assignment.status}
            creditValue={assignment.credit_value}
            initialProofUrl={assignment.proof_url}
            initialProofPublicUrl={proofPublicUrl}
          />
        </CardContent>
      </Card>
    </div>
  )
}
