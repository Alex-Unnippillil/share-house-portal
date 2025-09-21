import { ApplicationError, UserError } from '@/lib/errors'
import { assertCanMutate, normalizePagination } from './utils'
import type {
  AuthContext,
  DirectoryRepository,
  DirectoryUnit,
  PaginatedResult,
  UnitCreateInput,
  UnitListParams,
  UnitUpdateInput,
} from './types'

export async function listUnits(
  repository: DirectoryRepository,
  context: AuthContext,
  params: UnitListParams = {}
): Promise<PaginatedResult<DirectoryUnit>> {
  const { page, pageSize } = normalizePagination(params)
  return repository.listUnits(context.tenantId, { ...params, page, pageSize })
}

export async function getUnit(
  repository: DirectoryRepository,
  context: AuthContext,
  id: string
) {
  const unit = await repository.getUnit(context.tenantId, id)

  if (!unit) {
    throw new ApplicationError('Unit not found', { id })
  }

  return unit
}

export async function createUnit(
  repository: DirectoryRepository,
  context: AuthContext,
  payload: Omit<UnitCreateInput, 'tenant_id'>
) {
  assertCanMutate(context)

  const duplicate = await repository.findUnitByNumber(
    context.tenantId,
    payload.building_id,
    payload.unit_number
  )

  if (duplicate) {
    throw new UserError('A unit with this number already exists for the building.', {
      unitId: duplicate.id,
    })
  }

  return repository.createUnit({ ...payload, tenant_id: context.tenantId })
}

export async function updateUnit(
  repository: DirectoryRepository,
  context: AuthContext,
  id: string,
  updates: UnitUpdateInput
) {
  assertCanMutate(context)
  return repository.updateUnit(context.tenantId, id, updates)
}

export async function deleteUnit(
  repository: DirectoryRepository,
  context: AuthContext,
  id: string
) {
  assertCanMutate(context)
  await repository.deleteUnit(context.tenantId, id)
}
