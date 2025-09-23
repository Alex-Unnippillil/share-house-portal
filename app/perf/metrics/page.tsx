import { promises as fs } from 'node:fs'
import path from 'node:path'

import { headers } from 'next/headers'

import {
  PERFORMANCE_METRICS,
  listPerformanceBudgets,
  resolveBudgetForPath,
  type PerformanceCheckResult,
  type PerformanceReport,
} from '@/config/performance'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import MetricsClient from './metrics-client'

export const dynamic = 'force-dynamic'

const METRIC_LABELS: Record<(typeof PERFORMANCE_METRICS)[number], string> = {
  lcp: 'Largest Contentful Paint',
  tti: 'Time to Interactive',
}

export default async function MetricsPage() {
  const serverTiming = headers().get('server-timing')
  const currentBudget = resolveBudgetForPath('/perf/metrics')
  const budgets = listPerformanceBudgets()
  const report = await loadLatestReport()

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Performance metrics</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Monitor live navigation timings, compare them to our budgets, and review the latest Lighthouse audit captured in CI.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Live session metrics</CardTitle>
          <CardDescription>
            Values collected in-browser using Navigation Timing and Largest Contentful Paint observers. Time to Interactive is approximated using the
            DOM interactive milestone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MetricsClient budgets={currentBudget.metrics} serverTiming={serverTiming} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Latest CI budget check</CardTitle>
          <CardDescription>
            {report
              ? `Generated ${formatTimestamp(report.generatedAt)} via scripts/run-performance-budgets.ts.`
              : 'Run “pnpm perf:ci” to create an up-to-date Lighthouse report before releasing.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {report ? (
            <CiResultsTable results={report.results} />
          ) : (
            <p className="text-sm text-muted-foreground">
              No CI report found. After running the performance script the summary will appear here for quick reference.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configured budgets</CardTitle>
          <CardDescription>
            Defined in <code className="rounded bg-muted px-1 py-0.5">config/performance.ts</code> and enforced during the Lighthouse check.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 pr-4 font-medium">Route</th>
                  <th className="py-2 pr-4 font-medium">Description</th>
                  <th className="py-2 pr-4 font-medium">LCP budget</th>
                  <th className="py-2 pr-4 font-medium">TTI budget</th>
                </tr>
              </thead>
              <tbody>
                {budgets.map((budget) => (
                  <tr key={budget.route} className="border-b border-border last:border-b-0">
                    <td className="py-2 pr-4 font-medium text-foreground">{budget.route}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{budget.description ?? '—'}</td>
                    <td className="py-2 pr-4">{formatMs(budget.metrics.lcp)}</td>
                    <td className="py-2 pr-4">{formatMs(budget.metrics.tti)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function formatTimestamp(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

async function loadLatestReport(): Promise<PerformanceReport | null> {
  const targetPath = path.resolve(process.cwd(), 'app/perf/metrics/latest.json')

  try {
    const contents = await fs.readFile(targetPath, 'utf8')
    return JSON.parse(contents) as PerformanceReport
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null
    }

    console.error('Failed to read performance report from disk.', error)
    return null
  }
}

interface CiResultsTableProps {
  results: PerformanceCheckResult[]
}

function CiResultsTable({ results }: CiResultsTableProps) {
  if (results.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        The Lighthouse run completed but returned no results. Re-run the audit to populate this table.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr className="border-b border-border">
            <th className="py-2 pr-4 font-medium">Route</th>
            <th className="py-2 pr-4 font-medium">Status</th>
            <th className="py-2 pr-4 font-medium">Metrics</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result) => (
            <tr key={result.route} className="border-b border-border last:border-b-0">
              <td className="py-2 pr-4 align-top">
                <div className="font-medium text-foreground">{result.route}</div>
                <div className="text-xs text-muted-foreground">{result.description ?? '—'}</div>
              </td>
              <td className="py-2 pr-4 align-top">
                <Badge variant={result.passed ? 'complete' : 'destructive'}>
                  {result.passed ? 'Pass' : 'Fail'}
                </Badge>
              </td>
              <td className="py-2 pr-4">
                <ul className="space-y-1">
                  {PERFORMANCE_METRICS.map((metric) => {
                    const check = result.metrics[metric]
                    const actual = check?.actual
                    const budget = check?.budget
                    const passed = check?.passed ?? false
                    return (
                      <li key={`${result.route}-${metric}`} className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                        <span className="font-medium text-foreground">{METRIC_LABELS[metric]}</span>
                        <span className="text-sm text-muted-foreground">
                          {passed ? '✅' : '⚠️'} {formatOptionalMs(actual)} / {budget != null ? formatMs(budget) : '—'}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatMs(value: number): string {
  return `${Math.round(value)} ms`
}

function formatOptionalMs(value: number | null | undefined): string {
  if (value == null) {
    return 'n/a'
  }

  return formatMs(value)
}
