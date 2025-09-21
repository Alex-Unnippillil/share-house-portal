import { PackageServiceError } from '@/services/packages/errors'
import { createPackageServiceContext } from '@/services/packages/context'
import { packageIntakeSchema } from '@/services/packages/schemas'
import { intakePackage } from '@/services/packages/service'
import {
  respondWithServiceError,
  respondWithUnknownError,
  respondWithValidationError,
} from '@/services/packages/utils'

export async function POST(request: Request) {
  const payload = await request.json()
  const parsed = packageIntakeSchema.safeParse(payload)

  if (!parsed.success) {
    return respondWithValidationError(parsed.error)
  }

  try {
    const { repo, notifications } = createPackageServiceContext()
    const result = await intakePackage(repo, parsed.data, notifications)
    return Response.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof PackageServiceError) {
      return respondWithServiceError(error)
    }

    return respondWithUnknownError(error)
  }
}
