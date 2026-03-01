import { getReadinessSummary } from '@/lib/operations/dependency-health'

export async function GET() {
  const summary = await getReadinessSummary()
  const httpStatus = summary.status === 'healthy' ? 200 : summary.status === 'degraded' ? 206 : 503

  return Response.json(
    {
      status: summary.status,
      dependencies: summary.dependencies,
      timestamp: new Date().toISOString(),
    },
    { status: httpStatus }
  )
}
