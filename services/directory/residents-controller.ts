import { ApplicationError, UserError } from '@/lib/errors'
import { assertCanMutate, normalizePagination } from './utils'
import type {
  AuthContext,
  DirectoryRepository,
  DirectoryResident,
  PaginatedResult,
  ResidentCreateInput,
  ResidentListParams,
  ResidentUpdateInput,
} from './types'

export async function listResidents(
  repository: DirectoryRepository,
  context: AuthContext,
  params: ResidentListParams = {}
): Promise<PaginatedResult<DirectoryResident>> {
  const { page, pageSize } = normalizePagination(params)
  return repository.listResidents(context.tenantId, { ...params, page, pageSize })
}

export async function getResident(
  repository: DirectoryRepository,
  context: AuthContext,
  id: string
) {
  const resident = await repository.getResident(context.tenantId, id)

  if (!resident) {
    throw new ApplicationError('Resident not found', { id })
  }

  return resident
}

export async function createResident(
  repository: DirectoryRepository,
  context: AuthContext,
  payload: Omit<ResidentCreateInput, 'tenant_id'>
) {
  assertCanMutate(context)

  const duplicate = await repository.findResidentByEmail(context.tenantId, payload.email)

  if (duplicate) {
    throw new UserError('A resident with this email already exists.', {
      residentId: duplicate.id,
    })
  }

  return repository.createResident({ ...payload, tenant_id: context.tenantId })
}

export async function updateResident(
  repository: DirectoryRepository,
  context: AuthContext,
  id: string,
  updates: ResidentUpdateInput
) {
  assertCanMutate(context)
  return repository.updateResident(context.tenantId, id, updates)
}

export async function deleteResident(
  repository: DirectoryRepository,
  context: AuthContext,
  id: string
) {
  assertCanMutate(context)
  await repository.deleteResident(context.tenantId, id)
}
