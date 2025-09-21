import { PackageServiceError } from '@/services/packages/errors'
import { createPackageServiceContext } from '@/services/packages/context'
import { createSignatureStorage } from '@/services/packages/signature-storage'
import { packagePickupSchema } from '@/services/packages/schemas'
import { recordPackagePickup } from '@/services/packages/service'
import {
  respondWithServiceError,
  respondWithUnknownError,
  respondWithValidationError,
} from '@/services/packages/utils'

export async function POST(request: Request) {
  const payload = await request.json()
  const parsed = packagePickupSchema.safeParse(payload)

  if (!parsed.success) {
    return respondWithValidationError(parsed.error)
  }

  try {
    const storage = createSignatureStorage()
    const { repo, notifications } = createPackageServiceContext()
    const result = await recordPackagePickup(repo, storage, parsed.data, notifications)
    return Response.json(result)
  } catch (error) {
    if (error instanceof PackageServiceError) {
      return respondWithServiceError(error)
    }

    return respondWithUnknownError(error)
  }
}
