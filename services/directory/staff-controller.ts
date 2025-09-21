import { ApplicationError, UserError } from '@/lib/errors'
import { assertCanMutate, normalizePagination } from './utils'
import type {
  AuthContext,
  DirectoryRepository,
  DirectoryStaff,
  PaginatedResult,
  StaffCreateInput,
  StaffListParams,
  StaffUpdateInput,
} from './types'

export async function listStaff(
  repository: DirectoryRepository,
  context: AuthContext,
  params: StaffListParams = {}
): Promise<PaginatedResult<DirectoryStaff>> {
  const { page, pageSize } = normalizePagination(params)
  return repository.listStaff(context.tenantId, { ...params, page, pageSize })
}

export async function getStaff(
  repository: DirectoryRepository,
  context: AuthContext,
  id: string
) {
  const staff = await repository.getStaff(context.tenantId, id)

  if (!staff) {
    throw new ApplicationError('Staff member not found', { id })
  }

  return staff
}

export async function createStaff(
  repository: DirectoryRepository,
  context: AuthContext,
  payload: Omit<StaffCreateInput, 'tenant_id'>
) {
  assertCanMutate(context)

  const duplicate = await repository.findStaffByEmail(context.tenantId, payload.email)

  if (duplicate) {
    throw new UserError('A staff member with this email already exists.', {
      staffId: duplicate.id,
    })
  }

  return repository.createStaff({ ...payload, tenant_id: context.tenantId })
}

export async function updateStaff(
  repository: DirectoryRepository,
  context: AuthContext,
  id: string,
  updates: StaffUpdateInput
) {
  assertCanMutate(context)
  return repository.updateStaff(context.tenantId, id, updates)
}

export async function deleteStaff(
  repository: DirectoryRepository,
  context: AuthContext,
  id: string
) {
  assertCanMutate(context)
  await repository.deleteStaff(context.tenantId, id)
}
