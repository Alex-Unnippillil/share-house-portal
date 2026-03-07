import { getReadinessSummary } from '@/lib/operations/dependency-health'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const includeOptional = searchParams.get('full') === '1'

  const summary = await getReadinessSummary({ includeOptional })
  const httpStatus = summary.status === 'healthy' ? 200 : summary.status === 'degraded' ? 206 : 503

  return Response.json(
    {
      status: summary.status,
      core: summary.core,
      optional: summary.optional,
      includeOptional,
      timestamp: new Date().toISOString(),
    },
    { status: httpStatus }
  )
}
