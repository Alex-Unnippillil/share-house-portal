import { PackageServiceError } from '@/services/packages/errors'
import { createPackageServiceContext } from '@/services/packages/context'
import { reminderSchema } from '@/services/packages/schemas'
import { sendPackageReminders } from '@/services/packages/service'
import {
  respondWithServiceError,
  respondWithUnknownError,
  respondWithValidationError,
} from '@/services/packages/utils'

export async function POST(request: Request) {
  const payload = await request.json()
  const parsed = reminderSchema.safeParse(payload)

  if (!parsed.success) {
    return respondWithValidationError(parsed.error)
  }

  try {
    const { repo, notifications } = createPackageServiceContext()
    const result = await sendPackageReminders(repo, notifications, parsed.data)
    return Response.json(result)
  } catch (error) {
    if (error instanceof PackageServiceError) {
      return respondWithServiceError(error)
    }

    return respondWithUnknownError(error)
  }
}
