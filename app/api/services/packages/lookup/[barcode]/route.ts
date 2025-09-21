import { PackageServiceError } from '@/services/packages/errors'
import { createPackageServiceContext } from '@/services/packages/context'
import { packageLookupSchema } from '@/services/packages/schemas'
import { lookupPackage } from '@/services/packages/service'
import {
  respondWithServiceError,
  respondWithUnknownError,
  respondWithValidationError,
} from '@/services/packages/utils'

interface RouteContext {
  params: { barcode: string }
}

export async function GET(_request: Request, context: RouteContext) {
  const parsed = packageLookupSchema.safeParse({ barcode: context.params.barcode })

  if (!parsed.success) {
    return respondWithValidationError(parsed.error)
  }

  try {
    const { repo } = createPackageServiceContext()
    const result = await lookupPackage(repo, parsed.data.barcode)
    return Response.json(result)
  } catch (error) {
    if (error instanceof PackageServiceError) {
      return respondWithServiceError(error)
    }

    return respondWithUnknownError(error)
  }
}
