import { PackageServiceError } from '@/services/packages/errors'
import { createPackageServiceContext } from '@/services/packages/context'
import { staffOverviewSchema } from '@/services/packages/schemas'
import { getStaffConsoleOverview } from '@/services/packages/service'
import {
  respondWithServiceError,
  respondWithUnknownError,
  respondWithValidationError,
} from '@/services/packages/utils'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const rangeDaysParam = searchParams.get('rangeDays')
  const rangeDays = rangeDaysParam ? Number.parseInt(rangeDaysParam, 10) : undefined

  const parsed = staffOverviewSchema.safeParse({ rangeDays })

  if (!parsed.success) {
    return respondWithValidationError(parsed.error)
  }

  try {
    const { repo } = createPackageServiceContext()
    const result = await getStaffConsoleOverview(repo, parsed.data)
    return Response.json(result)
  } catch (error) {
    if (error instanceof PackageServiceError) {
      return respondWithServiceError(error)
    }

    return respondWithUnknownError(error)
  }
}
