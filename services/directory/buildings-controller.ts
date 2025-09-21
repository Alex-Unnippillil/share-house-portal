import { ApplicationError, UserError } from '@/lib/errors'
import { assertCanMutate, normalizePagination } from './utils'
import type {
  AuthContext,
  BuildingCreateInput,
  BuildingListParams,
  BuildingUpdateInput,
  DirectoryRepository,
  PaginatedResult,
  DirectoryBuilding,
} from './types'

export async function listBuildings(
  repository: DirectoryRepository,
  context: AuthContext,
  params: BuildingListParams = {}
): Promise<PaginatedResult<DirectoryBuilding>> {
  const { page, pageSize } = normalizePagination(params)
  return repository.listBuildings(context.tenantId, { ...params, page, pageSize })
}

export async function getBuilding(
  repository: DirectoryRepository,
  context: AuthContext,
  id: string
) {
  const building = await repository.getBuilding(context.tenantId, id)

  if (!building) {
    throw new ApplicationError('Building not found', { id })
  }

  return building
}

export async function createBuilding(
  repository: DirectoryRepository,
  context: AuthContext,
  payload: Omit<BuildingCreateInput, 'tenant_id'>
) {
  assertCanMutate(context)

  const duplicate = await repository.findBuildingByName(context.tenantId, payload.name)

  if (duplicate) {
    throw new UserError('A building with this name already exists.', {
      buildingId: duplicate.id,
    })
  }

  return repository.createBuilding({ ...payload, tenant_id: context.tenantId })
}

export async function updateBuilding(
  repository: DirectoryRepository,
  context: AuthContext,
  id: string,
  updates: BuildingUpdateInput
) {
  assertCanMutate(context)
  return repository.updateBuilding(context.tenantId, id, updates)
}

export async function deleteBuilding(
  repository: DirectoryRepository,
  context: AuthContext,
  id: string
) {
  assertCanMutate(context)
  await repository.deleteBuilding(context.tenantId, id)
}
