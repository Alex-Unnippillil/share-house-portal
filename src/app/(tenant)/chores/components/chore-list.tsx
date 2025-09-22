'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { format, formatDistanceToNow, isValid } from 'date-fns'
import {
  CalendarDays,
  Clock3,
  Paperclip,
  Repeat2,
  Sparkles,
  UserRound,
} from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

import type { ChoreAssignment, PageInfo } from '../types'

type TabValue = 'mine' | 'household'

type EmptyState = {
  title: string
  description: string
}

interface ChoreListProps {
  scope: 'member' | 'household'
  tabValue: TabValue
  assignments: ChoreAssignment[]
  pageInfo: PageInfo
  paginationParam: string
  searchParams: Record<string, string>
  emptyState: EmptyState
}

const statusStyles: Record<ChoreAssignment['status'], { label: string; className: string }> = {
  upcoming: { label: 'Upcoming', className: 'border-sky-100 bg-sky-50 text-sky-700' },
  due_today: { label: 'Due today', className: 'border-amber-100 bg-amber-50 text-amber-700' },
  pending: { label: 'Scheduled', className: 'border-muted bg-muted text-muted-foreground' },
  in_progress: { label: 'In progress', className: 'border-primary/20 bg-primary/10 text-primary' },
  overdue: { label: 'Overdue', className: 'border-destructive/20 bg-destructive/10 text-destructive' },
  completed: { label: 'Completed', className: 'border-emerald-100 bg-emerald-50 text-emerald-700' },
  skipped: { label: 'Skipped', className: 'border-slate-200 bg-slate-100 text-slate-600' },
}

const DEFAULT_STATUS_STYLE = { label: 'Scheduled', className: 'border-muted bg-muted text-muted-foreground' }

export function ChoreList({
  scope,
  tabValue,
  assignments,
  pageInfo,
  paginationParam,
  searchParams,
  emptyState,
}: ChoreListProps) {
  const pathname = usePathname()

  if (assignments.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-lg">{emptyState.title}</CardTitle>
          <CardDescription>{emptyState.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="size-4" />
          <span>Check back later as new chores are assigned.</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {assignments.map((assignment) => (
        <Card
          key={assignment.id}
          className="transition-shadow hover:shadow-md"
        >
          <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <CardTitle className="text-lg font-semibold">{assignment.title}</CardTitle>
              {assignment.description ? (
                <CardDescription>{assignment.description}</CardDescription>
              ) : null}
              <ChoreMeta assignment={assignment} />
            </div>
            <StatusBadge status={assignment.status} />
          </CardHeader>
          <CardContent className="flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {scope === 'household' && assignment.assignedMember ? (
                <div className="flex items-center gap-2">
                  <Avatar className="size-10">
                    <AvatarImage src={assignment.assignedMember.avatarUrl ?? undefined} alt={assignment.assignedMember.fullName} />
                    <AvatarFallback>
                      {getInitials(assignment.assignedMember.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-foreground">{assignment.assignedMember.fullName}</p>
                    <p className="text-xs text-muted-foreground">Assigned roommate</p>
                  </div>
                </div>
              ) : null}

              {typeof assignment.points === 'number' ? (
                <Badge variant="outline" className="border-amber-100 bg-amber-50 text-amber-700">
                  +{assignment.points} pts
                </Badge>
              ) : null}

              {assignment.attachmentsCount ? (
                <span className="flex items-center gap-1 text-xs">
                  <Paperclip className="size-4" />
                  {assignment.attachmentsCount} attachment{assignment.attachmentsCount === 1 ? '' : 's'}
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {scope === 'member' ? (
                <>
                  <Button size="sm">Log completion</Button>
                  <Button size="sm" variant="outline">
                    View history
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="secondary">
                    Reassign
                  </Button>
                  <Button size="sm" variant="outline">
                    Send reminder
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      <PaginationControls
        pathname={pathname}
        pageInfo={pageInfo}
        paginationParam={paginationParam}
        searchParams={searchParams}
        tabValue={tabValue}
      />
    </div>
  )
}

function ChoreMeta({ assignment }: { assignment: ChoreAssignment }) {
  const dueDate = new Date(assignment.dueDate)
  const isDueValid = isValid(dueDate)
  const dueLabel = isDueValid ? format(dueDate, 'EEE, MMM d') : 'No due date'
  const dueDistance = isDueValid ? formatDistanceToNow(dueDate, { addSuffix: true }) : null

  const lastCompleted = assignment.lastCompletedAt
    ? new Date(assignment.lastCompletedAt)
    : null

  const lastCompletedDistance = lastCompleted && isValid(lastCompleted)
    ? formatDistanceToNow(lastCompleted, { addSuffix: true })
    : null

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
      <span className="flex items-center gap-1">
        <CalendarDays className="size-4" />
        <span>Due {dueLabel}{dueDistance ? ` · ${dueDistance}` : ''}</span>
      </span>

      {assignment.frequency ? (
        <span className="flex items-center gap-1">
          <Repeat2 className="size-4" />
          <span>{assignment.frequency}</span>
        </span>
      ) : null}

      {lastCompletedDistance ? (
        <span className="flex items-center gap-1">
          <Clock3 className="size-4" />
          <span>Last completed {lastCompletedDistance}</span>
        </span>
      ) : null}

    </div>
  )
}

function StatusBadge({ status }: { status: ChoreAssignment['status'] }) {
  const meta = statusStyles[status] ?? DEFAULT_STATUS_STYLE
  return (
    <Badge
      variant="outline"
      className={cn('self-start text-xs font-medium uppercase tracking-wide', meta.className)}
    >
      {meta.label}
    </Badge>
  )
}

interface PaginationControlsProps {
  pathname: string
  pageInfo: PageInfo
  paginationParam: string
  searchParams: Record<string, string>
  tabValue: TabValue
}

function PaginationControls({
  pathname,
  pageInfo,
  paginationParam,
  searchParams,
  tabValue,
}: PaginationControlsProps) {
  if (pageInfo.total <= pageInfo.pageSize && pageInfo.page === 1 && !pageInfo.hasMore) {
    return null
  }

  const totalPages = Math.max(1, Math.ceil(pageInfo.total / pageInfo.pageSize))
  const prevPage = pageInfo.page > 1 ? pageInfo.page - 1 : null
  const nextPage = pageInfo.hasMore ? pageInfo.page + 1 : null

  const buildHref = (page: number | null) => {
    if (!page) {
      return null
    }

    const params = new URLSearchParams(searchParams)

    if (page <= 1) {
      params.delete(paginationParam)
    } else {
      params.set(paginationParam, String(page))
    }

    if (tabValue === 'household') {
      params.set('tab', 'household')
    } else {
      params.delete('tab')
    }

    const query = params.toString()
    return query ? `${pathname}?${query}` : pathname
  }

  const prevHref = buildHref(prevPage)
  const nextHref = buildHref(nextPage)

  const startItem = pageInfo.total === 0 ? 0 : (pageInfo.page - 1) * pageInfo.pageSize + 1
  const endItem = Math.min(pageInfo.total, pageInfo.page * pageInfo.pageSize)

  return (
    <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">
        Showing {startItem}-{endItem} of {pageInfo.total}
      </p>
      <div className="flex items-center gap-2">
        {prevHref ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={prevHref}>Previous</Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
        )}

        <span className="text-xs text-muted-foreground">
          Page {pageInfo.page} of {totalPages}
        </span>

        {nextHref ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={nextHref}>Next</Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        )}
      </div>
    </div>
  )
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
