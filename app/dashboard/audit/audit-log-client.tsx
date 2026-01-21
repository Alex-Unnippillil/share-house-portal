"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { format, parseISO } from "date-fns"
import { Download, Filter, Loader2, Search, Slash } from "lucide-react"
import { useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  AuditLogFilterFacets,
  AuditLogFilters,
  AuditLogQueryWarning,
  AuditLogRow,
} from "@/lib/audit-logs"

import type {
  AuditLogExportInput,
  AuditLogExportResponse,
} from "./actions"

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

type AuditLogsPageClientProps = {
  logs: AuditLogRow[]
  filters: AuditLogFilters
  pagination: {
    count: number
    page: number
    limit: number
    totalPages: number
  }
  facets: AuditLogFilterFacets
  warnings: AuditLogQueryWarning[]
  appliedFilters: Array<{ key: string; value: string }>
  defaultLimit: number
  queryError?: string | null
  exportAction: (input: AuditLogExportInput) => Promise<AuditLogExportResponse>
}

function formatDateForInput(value: string | undefined) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString().slice(0, 10)
}

function describeWarning(warning: AuditLogQueryWarning) {
  switch (warning.reason) {
    case "future_end_date":
      return "End date was adjusted to avoid future timestamps."
    case "date_range_clamped":
      return "Date range was limited to the maximum allowed window."
    case "limit_clamped":
      return "Page size exceeded the maximum and was reduced."
    case "page_clamped":
      return "Page number was too large and has been clamped."
    default:
      return null
  }
}

function toIsoDate(value: string | null, endOfDay = false) {
  if (!value) return undefined
  const suffix = endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z"
  const iso = new Date(`${value}${suffix}`).toISOString()
  return iso
}

function buildQueryString(filters: AuditLogFilters, page: number, limit: number) {
  const params = new URLSearchParams()

  if (filters.search) params.set("search", filters.search)
  if (filters.actorRole) params.set("actorRole", filters.actorRole)
  if (filters.action) params.set("action", filters.action)
  if (filters.entityType) params.set("entityType", filters.entityType)
  if (filters.actorId) params.set("actorId", filters.actorId)
  if (filters.householdId) params.set("householdId", filters.householdId)
  if (filters.startDate) params.set("startDate", filters.startDate)
  if (filters.endDate) params.set("endDate", filters.endDate)

  params.set("page", String(page))
  params.set("limit", String(limit))

  return params.toString()
}

export function AuditLogsPageClient({
  logs,
  filters,
  pagination,
  facets,
  warnings,
  appliedFilters,
  defaultLimit,
  queryError,
  exportAction,
}: AuditLogsPageClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isExporting, startExport] = useTransition()
  const [exportError, setExportError] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState(filters.search ?? "")
  const [actorRole, setActorRole] = useState(filters.actorRole ?? "")
  const [entityType, setEntityType] = useState(filters.entityType ?? "")
  const [action, setAction] = useState(filters.action ?? "")
  const [actorId, setActorId] = useState(filters.actorId ?? "")
  const [householdId, setHouseholdId] = useState(filters.householdId ?? "")
  const [startDate, setStartDate] = useState(formatDateForInput(filters.startDate))
  const [endDate, setEndDate] = useState(formatDateForInput(filters.endDate))
  const [pageSize, setPageSize] = useState<number>(pagination.limit)

  useEffect(() => {
    setSearchTerm(filters.search ?? "")
    setActorRole(filters.actorRole ?? "")
    setEntityType(filters.entityType ?? "")
    setAction(filters.action ?? "")
    setActorId(filters.actorId ?? "")
    setHouseholdId(filters.householdId ?? "")
    setStartDate(formatDateForInput(filters.startDate))
    setEndDate(formatDateForInput(filters.endDate))
    setPageSize(pagination.limit)
  }, [filters, pagination.limit])

  const warningMessages = useMemo(
    () =>
      warnings
        .map(describeWarning)
        .filter((message): message is string => Boolean(message)),
    [warnings]
  )

  const pageSizeOptions = useMemo(() => {
    const values = new Set<number>(PAGE_SIZE_OPTIONS)
    values.add(pagination.limit)
    return Array.from(values.values()).sort((a, b) => a - b)
  }, [pagination.limit])

  const hasActiveFilters = appliedFilters.length > 0

  const submitFilters = (nextPage: number, nextLimit: number) => {
    const nextFilters: AuditLogFilters = {
      search: searchTerm || undefined,
      actorRole: actorRole || undefined,
      entityType: entityType || undefined,
      action: action || undefined,
      actorId: actorId || undefined,
      householdId: householdId || undefined,
      startDate: toIsoDate(startDate, false),
      endDate: toIsoDate(endDate, true),
    }

    const query = buildQueryString(nextFilters, nextPage, nextLimit)
    startTransition(() => {
      router.replace(`?${query}`, { scroll: false })
    })
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setExportError(null)
    submitFilters(1, pageSize)
  }

  const handleReset = () => {
    setSearchTerm("")
    setActorRole("")
    setEntityType("")
    setAction("")
    setActorId("")
    setHouseholdId("")
    setStartDate("")
    setEndDate("")
    setPageSize(defaultLimit)
    setExportError(null)

    const query = buildQueryString({}, 1, defaultLimit)
    startTransition(() => {
      router.replace(query ? `?${query}` : "?", { scroll: false })
    })
  }

  const handlePageChange = (direction: "previous" | "next") => {
    const nextPage = direction === "previous" ? pagination.page - 1 : pagination.page + 1
    const query = buildQueryString(filters, nextPage, pagination.limit)
    startTransition(() => {
      router.replace(`?${query}`, { scroll: false })
    })
  }

  const handleExport = () => {
    setExportError(null)
    startExport(async () => {
      const result = await exportAction({ filters })
      if (!result.success) {
        setExportError(result.error)
        return
      }

      const blob = new Blob([result.csv], {
        type: "text/csv;charset=utf-8",
      })
      const downloadUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = result.fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(downloadUrl)
    })
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Audit logs</h1>
        <p className="text-sm text-muted-foreground">
          Review privileged actions across the portal with contextual payloads and
          export-ready histories.
        </p>
      </header>

      {queryError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {queryError}
        </div>
      ) : null}

      {warningMessages.length ? (
        <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-100">
          <p className="font-medium">Some filters were adjusted for safety:</p>
          <ul className="list-disc space-y-1 pl-5">
            {warningMessages.map((message, index) => (
              <li key={index}>{message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="size-4" />
            Search &amp; filters
          </CardTitle>
          <CardDescription>
            Combine actor, entity, and time filters to narrow the event history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="grid gap-4 lg:grid-cols-12 lg:items-end"
          >
            <div className="lg:col-span-4">
              <Label htmlFor="audit-search" className="mb-2 block text-xs font-medium uppercase tracking-wide">
                Search across actors &amp; entities
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="audit-search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search email, entity, or action"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="lg:col-span-2">
              <Label htmlFor="audit-role" className="mb-2 block text-xs font-medium uppercase tracking-wide">
                Actor role
              </Label>
              <Select value={actorRole} onValueChange={setActorRole}>
                <SelectTrigger id="audit-role">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All roles</SelectItem>
                  {facets.actorRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="lg:col-span-2">
              <Label htmlFor="audit-entity" className="mb-2 block text-xs font-medium uppercase tracking-wide">
                Entity type
              </Label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger id="audit-entity">
                  <SelectValue placeholder="All entities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All entities</SelectItem>
                  {facets.entityTypes.map((entity) => (
                    <SelectItem key={entity} value={entity}>
                      {entity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="lg:col-span-2">
              <Label htmlFor="audit-action" className="mb-2 block text-xs font-medium uppercase tracking-wide">
                Action
              </Label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger id="audit-action">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All actions</SelectItem>
                  {facets.actions.map((actionValue) => (
                    <SelectItem key={actionValue} value={actionValue}>
                      {actionValue}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="lg:col-span-2">
              <Label htmlFor="audit-page-size" className="mb-2 block text-xs font-medium uppercase tracking-wide">
                Page size
              </Label>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => setPageSize(Number(value))}
              >
                <SelectTrigger id="audit-page-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option} / page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="lg:col-span-3">
              <Label htmlFor="audit-actor" className="mb-2 block text-xs font-medium uppercase tracking-wide">
                Actor ID
              </Label>
              <Input
                id="audit-actor"
                value={actorId}
                onChange={(event) => setActorId(event.target.value)}
                placeholder="UUID"
              />
            </div>
            <div className="lg:col-span-3">
              <Label htmlFor="audit-household" className="mb-2 block text-xs font-medium uppercase tracking-wide">
                Household ID
              </Label>
              <Input
                id="audit-household"
                value={householdId}
                onChange={(event) => setHouseholdId(event.target.value)}
                placeholder="Optional scope"
              />
            </div>
            <div className="lg:col-span-3">
              <Label htmlFor="audit-start-date" className="mb-2 block text-xs font-medium uppercase tracking-wide">
                Start date
              </Label>
              <Input
                id="audit-start-date"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>
            <div className="lg:col-span-3">
              <Label htmlFor="audit-end-date" className="mb-2 block text-xs font-medium uppercase tracking-wide">
                End date
              </Label>
              <Input
                id="audit-end-date"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2 lg:col-span-3 lg:flex-row lg:items-end lg:justify-end">
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Apply filters
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={isPending}
              >
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-lg">Log entries</CardTitle>
            <CardDescription>
              Showing {logs.length} of {pagination.count} events.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 text-sm md:items-end">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={isExporting || !logs.length}
              >
                {isExporting ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Download className="mr-2 size-4" />
                )}
                Export CSV
              </Button>
            </div>
            {exportError ? (
              <p className="text-xs text-destructive">{exportError}</p>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasActiveFilters ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground">Active filters:</span>
              {appliedFilters.map((filter) => (
                <Badge key={`${filter.key}-${filter.value}`} variant="secondary">
                  {filter.key === "dateRange"
                    ? (() => {
                        const [start, end] = filter.value.split(" – ")
                        const formattedStart = start
                          ? (() => {
                              try {
                                return format(parseISO(start), "MMM d, yyyy")
                              } catch {
                                return start
                              }
                            })()
                          : ""
                        const formattedEnd = end
                          ? (() => {
                              try {
                                return format(parseISO(end), "MMM d, yyyy")
                              } catch {
                                return end
                              }
                            })()
                          : ""
                        return `${formattedStart} → ${formattedEnd}`
                      })()
                    : filter.value}
                </Badge>
              ))}
            </div>
          ) : null}

          <div className="rounded-md border">
            <ScrollArea className="max-h-[540px]">
              <table className="min-w-full divide-y text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left text-xs uppercase text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Timestamp</th>
                    <th className="px-4 py-3 font-medium">Actor</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Entity</th>
                    <th className="px-4 py-3 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.length ? (
                    logs.map((log) => {
                      const timestamp = log.created_at
                        ? format(parseISO(log.created_at), "MMM d, yyyy · HH:mm")
                        : "—"
                      const actorLabel = log.actor_name || log.actor_email || "System"
                      const actorMeta = [log.actor_email, log.actor_role]
                        .filter(Boolean)
                        .join(" · ")
                      const entityMeta = [log.entity_type, log.entity_id]
                        .filter(Boolean)
                        .join(" · ")

                      return (
                        <tr key={log.id} className="align-top">
                          <td className="whitespace-nowrap px-4 py-3 text-sm font-medium">
                            {timestamp}
                          </td>
                          <td className="space-y-1 px-4 py-3 text-sm">
                            <div className="font-medium text-foreground">{actorLabel}</div>
                            {actorMeta ? (
                              <div className="text-xs text-muted-foreground">{actorMeta}</div>
                            ) : null}
                          </td>
                          <td className="space-y-1 px-4 py-3 text-sm">
                            <Badge variant="outline" className="rounded">
                              {log.action}
                            </Badge>
                            {log.ip_address ? (
                              <div className="text-xs text-muted-foreground">
                                IP {log.ip_address}
                              </div>
                            ) : null}
                          </td>
                          <td className="space-y-1 px-4 py-3 text-sm">
                            {entityMeta ? (
                              <div className="font-medium text-foreground">{entityMeta}</div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                            {log.entity_name ? (
                              <div className="text-xs text-muted-foreground">
                                {log.entity_name}
                              </div>
                            ) : null}
                            {log.household_id ? (
                              <div className="text-xs text-muted-foreground">
                                Household {log.household_id}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-2 text-xs">
                              <div className="rounded border bg-muted/40 p-2 font-mono">
                                <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words">
                                  {JSON.stringify(log.payload, null, 2)}
                                </pre>
                              </div>
                              {log.context && Object.keys(log.context).length ? (
                                <div className="rounded border bg-muted/40 p-2 font-mono">
                                  <pre className="max-h-24 overflow-auto whitespace-pre-wrap break-words">
                                    {JSON.stringify(log.context, null, 2)}
                                  </pre>
                                </div>
                              ) : null}
                              {log.user_agent ? (
                                <p className="text-muted-foreground">
                                  UA {log.user_agent}
                                </p>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-16 text-center text-sm text-muted-foreground">
                        <div className="flex flex-col items-center gap-3">
                          <Slash className="size-6" />
                          <p>No audit events match the selected filters.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </ScrollArea>
          </div>

          <div className="flex flex-col gap-2 border-t pt-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            <div>
              Page {pagination.page} of {pagination.totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handlePageChange("previous")}
                disabled={isPending || pagination.page <= 1}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handlePageChange("next")}
                disabled={
                  isPending ||
                  pagination.page >= pagination.totalPages ||
                  logs.length === 0
                }
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
