import type { ReactNode } from 'react'

import { differenceInCalendarDays } from 'date-fns'
import { AlertTriangle, CheckCircle2, ClipboardList, Clock10 } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { ChoreList } from './components/chore-list'
import { DEFAULT_PAGE_SIZE, getChoreAssignments, getCurrentMemberProfile } from './data'
import type { ChoreAssignment } from './types'

interface PageProps {
  searchParams?: Record<string, string | string[] | undefined>
}

function parsePageParam(value?: string | string[]): number {
  if (!value) {
    return 1
  }

  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number.parseInt(raw ?? '', 10)

  if (Number.isNaN(parsed) || parsed <= 0) {
    return 1
  }

  return parsed
}

function normalizeSearchParams(params?: Record<string, string | string[] | undefined>) {
  const normalized: Record<string, string> = {}

  if (!params) {
    return normalized
  }

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      if (value[0]) {
        normalized[key] = value[0]
      }
    } else if (typeof value === 'string' && value.length > 0) {
      normalized[key] = value
    }
  }

  return normalized
}

function getSummaryMetrics(assignments: ChoreAssignment[]) {
  const now = new Date()
  const upcoming = assignments.filter((item) => {
    const due = new Date(item.dueDate)
    const days = differenceInCalendarDays(due, now)
    return days >= 0 && days <= 3
  }).length

  const overdue = assignments.filter((item) => item.status === 'overdue').length
  const completed = assignments.filter((item) => item.status === 'completed').length

  return { upcoming, overdue, completed }
}

export default async function ChoresPage({ searchParams }: PageProps) {
  const currentTab = searchParams?.tab === 'household' ? 'household' : 'mine'
  const memberPage = parsePageParam(searchParams?.memberPage)
  const householdPage = parsePageParam(searchParams?.householdPage)

  const normalizedSearchParams = normalizeSearchParams(searchParams)

  const memberProfile = await getCurrentMemberProfile()

  const [memberAssignments, householdAssignments] = await Promise.all([
    getChoreAssignments({
      scope: 'member',
      memberId: memberProfile.id,
      householdId: memberProfile.householdId ?? undefined,
      page: memberPage,
      pageSize: DEFAULT_PAGE_SIZE,
    }),
    getChoreAssignments({
      scope: 'household',
      householdId: memberProfile.householdId ?? undefined,
      page: householdPage,
      pageSize: DEFAULT_PAGE_SIZE,
    }),
  ])

  const summary = getSummaryMetrics([
    ...memberAssignments.assignments,
    ...householdAssignments.assignments,
  ])

  return (
    <div className="container max-w-6xl space-y-8 py-8">
      <header className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Chore assignments</h1>
            <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
              Stay aligned on rotating responsibilities, track due dates, and keep your household running smoothly.
            </p>
          </div>
          <Card className="max-w-sm">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0">
              <Avatar className="size-12">
                <AvatarImage src={memberProfile.avatarUrl ?? undefined} alt={memberProfile.fullName} />
                <AvatarFallback>{getInitials(memberProfile.fullName)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-base">{memberProfile.fullName}</CardTitle>
                <CardDescription className="text-xs">
                  Viewing assignments {memberProfile.householdId ? `for household ${memberProfile.householdId}` : 'across your household'}
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        </div>
        <Separator />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="Assigned to you"
            value={memberAssignments.pageInfo.total}
            description="Active chores currently on your list"
            icon={<ClipboardList className="size-5 text-primary" />}
          />
          <SummaryCard
            title="Due soon"
            value={summary.upcoming}
            description="Tasks due within the next three days"
            icon={<Clock10 className="size-5 text-primary" />}
          />
          <SummaryCard
            title="Overdue"
            value={summary.overdue}
            description="Chores needing immediate attention"
            icon={<AlertTriangle className="size-5 text-primary" />}
          />
          <SummaryCard
            title="Completed"
            value={summary.completed}
            description="Recently wrapped up household tasks"
            icon={<CheckCircle2 className="size-5 text-primary" />}
          />
        </div>
      </header>

      <Tabs defaultValue={currentTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="mine">My assignments</TabsTrigger>
          <TabsTrigger value="household">Household view</TabsTrigger>
        </TabsList>

        <TabsContent value="mine">
          <ChoreList
            scope="member"
            tabValue="mine"
            assignments={memberAssignments.assignments}
            pageInfo={memberAssignments.pageInfo}
            paginationParam="memberPage"
            searchParams={normalizedSearchParams}
            emptyState={{
              title: 'No chores assigned to you right now',
              description: 'You are all caught up. Take a breather and check back for new rotations.',
            }}
          />
        </TabsContent>

        <TabsContent value="household">
          <ChoreList
            scope="household"
            tabValue="household"
            assignments={householdAssignments.assignments}
            pageInfo={householdAssignments.pageInfo}
            paginationParam="householdPage"
            searchParams={normalizedSearchParams}
            emptyState={{
              title: 'No active household chores',
              description: 'There are no shared tasks scheduled. Create a rotation to keep things balanced.',
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SummaryCard({
  title,
  value,
  description,
  icon,
}: {
  title: string
  value: number
  description: string
  icon: ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
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
