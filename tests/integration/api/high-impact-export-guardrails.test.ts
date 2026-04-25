import { beforeEach, describe, expect, it, vi } from 'vitest'

const getUser = vi.fn()
const fetchMemberRole = vi.fn()
const getFinanceRows = vi.fn()
const toCsv = vi.fn()
const writeAuditRecord = vi.fn()

vi.mock('@/utils/supaone', () => ({
  createSupbaseServerClientReadOnly: vi.fn(async () => ({
    auth: { getUser },
  })),
}))

vi.mock('@/lib/data/members', () => ({
  fetchMemberRole,
}))

vi.mock('@/lib/operations/data', () => ({
  getFinanceRows,
  toCsv,
}))

vi.mock('@/lib/audit', () => ({
  writeAuditRecord,
}))

describe('GET /api/exports/finance guardrails', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    const { resetRateLimitStore } = await import('@/lib/rate-limit')
    resetRateLimitStore()
  })

  it('denies users without privileged roles', async () => {
    getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-1' } },
    })
    fetchMemberRole.mockResolvedValueOnce('tenant')

    const { GET } = await import('@/app/api/exports/finance/route')
    const response = await GET(new Request('http://localhost/api/exports/finance'))

    expect(response.status).toBe(403)
    expect(writeAuditRecord).not.toHaveBeenCalled()
  })

  it('returns 429 when the export rate limit is exceeded', async () => {
    getUser.mockResolvedValue({
      data: { user: { id: 'manager-1' } },
    })
    fetchMemberRole.mockResolvedValue('property_manager')
    getFinanceRows.mockResolvedValue({ rows: [{ id: 'p-1' }] })
    toCsv.mockReturnValue('id\np-1')

    const { GET } = await import('@/app/api/exports/finance/route')

    for (let index = 0; index < 5; index += 1) {
      const okResponse = await GET(new Request('http://localhost/api/exports/finance'))
      expect(okResponse.status).toBe(200)
    }

    const limitedResponse = await GET(new Request('http://localhost/api/exports/finance'))
    expect(limitedResponse.status).toBe(429)
    await expect(limitedResponse.json()).resolves.toMatchObject({
      error: { code: 'RATE_LIMIT_EXCEEDED' },
    })
  })

  it('writes audit metadata with actor, scope, timestamp, and row count for successful exports', async () => {
    getUser.mockResolvedValueOnce({
      data: { user: { id: 'admin-1' } },
    })
    fetchMemberRole.mockResolvedValueOnce('admin')
    getFinanceRows.mockResolvedValueOnce({ rows: [{ id: 'a' }, { id: 'b' }] })
    toCsv.mockReturnValueOnce('id\na\nb')

    const { GET } = await import('@/app/api/exports/finance/route')
    const response = await GET(new Request('http://localhost/api/exports/finance'))

    expect(response.status).toBe(200)
    expect(writeAuditRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'operations.export.finance',
        actorId: 'admin-1',
        actorRole: 'admin',
        metadata: expect.objectContaining({
          scope: 'finance',
          rowCount: 2,
          exportedAt: expect.any(String),
        }),
      })
    )
  })
})
