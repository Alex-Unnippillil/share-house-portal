import { beforeEach, describe, expect, it, vi } from 'vitest'

const requirePrivilegedApiAccess = vi.fn()
const writeAuditRecord = vi.fn()
const getBookingRows = vi.fn()
const getFinanceRows = vi.fn()
const getMaintenanceRows = vi.fn()
const getVisitorRows = vi.fn()
const toCsv = vi.fn()

vi.mock('@/lib/authz', () => ({ requirePrivilegedApiAccess }))
vi.mock('@/lib/audit', () => ({ writeAuditRecord }))
vi.mock('@/lib/operations/data', () => ({
  getBookingRows,
  getFinanceRows,
  getMaintenanceRows,
  getVisitorRows,
  toCsv,
}))

const ROUTES = [
  { name: 'bookings', path: '@/app/api/exports/bookings/route', getter: getBookingRows },
  { name: 'finance', path: '@/app/api/exports/finance/route', getter: getFinanceRows },
  { name: 'maintenance', path: '@/app/api/exports/maintenance/route', getter: getMaintenanceRows },
  { name: 'visitors', path: '@/app/api/exports/visitors/route', getter: getVisitorRows },
] as const

beforeEach(() => {
  vi.clearAllMocks()
  toCsv.mockReturnValue('col1,col2\nvalue1,value2')
})

describe('export endpoint authz contract', () => {
  for (const route of ROUTES) {
    it(`${route.name}: unauthenticated => 401`, async () => {
      requirePrivilegedApiAccess.mockResolvedValueOnce({
        response: Response.json({ message: 'Unauthorized' }, { status: 401 }),
      })

      const mod = await import(route.path)
      const response = await mod.GET()

      expect(response.status).toBe(401)
      await expect(response.json()).resolves.toEqual({ message: 'Unauthorized' })
    })

    it(`${route.name}: non-privileged => 403`, async () => {
      requirePrivilegedApiAccess.mockResolvedValueOnce({
        response: Response.json({ message: 'Forbidden' }, { status: 403 }),
      })

      const mod = await import(route.path)
      const response = await mod.GET()

      expect(response.status).toBe(403)
      await expect(response.json()).resolves.toEqual({ message: 'Forbidden' })
    })

    it(`${route.name}: privileged => 200 with CSV headers`, async () => {
      requirePrivilegedApiAccess.mockResolvedValueOnce({
        user: { id: 'user-1' },
        role: 'admin',
        supabase: {},
      })
      route.getter.mockResolvedValueOnce({ rows: [{ id: 'row-1' }] })

      const mod = await import(route.path)
      const response = await mod.GET()

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toContain('text/csv')
      expect(response.headers.get('Content-Disposition')).toContain(`filename="${route.name}-export-`)
      await expect(response.text()).resolves.toContain('col1,col2')
    })
  }
})
