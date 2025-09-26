import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest'
import { randomUUID } from 'crypto'
import { SupabaseTestHarness, type TestActor } from './harness'

interface SeedData {
  tenants: [TestActor, TestActor]
  manager: TestActor
  tenantPaymentId: string
  roommatePaymentId: string
  tenantNotificationId: string
  roommateNotificationId: string
  managerNotificationId: string
  tenantEmailNotificationId: string
  roommateEmailNotificationId: string
}

describe('Supabase RLS policies', () => {
  let harness: SupabaseTestHarness
  let seed: SeedData

  beforeAll(async () => {
    process.env.SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET ?? 'supabase_test_secret'
    harness = await SupabaseTestHarness.create()
  })

  afterAll(async () => {
    await harness.close()
  })

  beforeEach(async () => {
    await harness.reset()

    const tenant: TestActor = {
      id: randomUUID(),
      email: 'tenant@example.com',
      fullName: 'Tenant One',
      unitId: randomUUID(),
      appRole: 'tenant',
    }

    const roommate: TestActor = {
      id: randomUUID(),
      email: 'roommate@example.com',
      fullName: 'Roommate Two',
      unitId: tenant.unitId,
      appRole: 'roommate',
    }

    const manager: TestActor = {
      id: randomUUID(),
      email: 'manager@example.com',
      fullName: 'Manager Three',
      appRole: 'property_manager',
    }

    await harness.insertActor(tenant)
    await harness.insertActor(roommate)
    await harness.insertActor(manager)

    const tenantPaymentId = randomUUID()
    const roommatePaymentId = randomUUID()
    await harness.db.query(
      `INSERT INTO public.rent_payments (id, user_id, amount, currency, status, description)
       VALUES ($1, $2, $3, 'usd', 'pending', 'May rent'),
              ($4, $5, $6, 'usd', 'succeeded', 'Back rent')`,
      [tenantPaymentId, tenant.id, 120000, roommatePaymentId, roommate.id, 90000],
    )

    const tenantNotificationId = randomUUID()
    const roommateNotificationId = randomUUID()
    const managerNotificationId = randomUUID()
    await harness.db.query(
      `INSERT INTO public.notifications (id, user_id, title, message, type)
       VALUES ($1, $2, 'Rent due', 'May rent is due soon', 'warning'),
              ($3, $4, 'Rent posted', 'Payment received', 'success'),
              ($5, $6, 'Unit update', 'New tenant moved in', 'info')`,
      [tenantNotificationId, tenant.id, roommateNotificationId, roommate.id, managerNotificationId, manager.id],
    )

    const tenantEmailNotificationId = randomUUID()
    const roommateEmailNotificationId = randomUUID()
    await harness.db.query(
      `INSERT INTO public.email_notifications (id, user_id, recipient, subject, template, status)
       VALUES ($1, $2, 'tenant@example.com', 'Rent receipt', 'receipt', 'sent'),
              ($3, $4, 'roommate@example.com', 'Rent reminder', 'reminder', 'sent')`,
      [tenantEmailNotificationId, tenant.id, roommateEmailNotificationId, roommate.id],
    )

    seed = {
      tenants: [tenant, roommate],
      manager,
      tenantPaymentId,
      roommatePaymentId,
      tenantNotificationId,
      roommateNotificationId,
      managerNotificationId,
      tenantEmailNotificationId,
      roommateEmailNotificationId,
    }
  })

  describe('rent_payments policies', () => {
    it('allows tenants to select only their own rent payments', async () => {
      const [tenant, roommate] = seed.tenants

      const tenantRows = await harness.withAuthContext(tenant, async () => {
        const { rows } = await harness.db.query(
          'SELECT id, user_id FROM public.rent_payments ORDER BY created_at',
        )
        return rows
      })

      expect(tenantRows).toEqual([
        expect.objectContaining({ id: seed.tenantPaymentId, user_id: tenant.id }),
      ])

      const roommateRows = await harness.withAuthContext(roommate, async () => {
        const { rows } = await harness.db.query(
          'SELECT id, user_id FROM public.rent_payments ORDER BY created_at',
        )
        return rows
      })

      expect(roommateRows).toEqual([
        expect.objectContaining({ id: seed.roommatePaymentId, user_id: roommate.id }),
      ])
    })

    it('allows property managers to select all rent payments', async () => {
      const rows = await harness.withAuthContext(seed.manager, async () => {
        const { rows } = await harness.db.query(
          'SELECT id, user_id FROM public.rent_payments ORDER BY user_id',
        )
        return rows
      })

      const userIds = rows.map((row) => row.user_id)
      expect(userIds).toContain(seed.tenants[0].id)
      expect(userIds).toContain(seed.tenants[1].id)
    })

    it('blocks tenants from inserting rent payments for other users', async () => {
      const [tenant, roommate] = seed.tenants

      await expect(
        harness.withAuthContext(tenant, async () => {
          await harness.db.query(
            `INSERT INTO public.rent_payments (user_id, amount, currency, status, description)
             VALUES ($1, $2, 'usd', 'pending', 'Attempted insert by tenant')`,
            [roommate.id, 10000],
          )
        }),
      ).rejects.toThrow(/rent_payments/i)
    })

    it('prevents updates to rent payments through the authenticated role', async () => {
      const [tenant] = seed.tenants

      const tenantUpdate = await harness.withAuthContext(tenant, async () =>
        harness.db.query(
          `UPDATE public.rent_payments SET status = 'failed' WHERE id = $1`,
          [seed.tenantPaymentId],
        ),
      )

      const managerUpdate = await harness.withAuthContext(seed.manager, async () =>
        harness.db.query(
          `UPDATE public.rent_payments SET status = 'failed' WHERE id = $1`,
          [seed.roommatePaymentId],
        ),
      )

      expect(tenantUpdate.affectedRows).toBe(0)
      expect(managerUpdate.affectedRows).toBe(0)

      const { rows } = await harness.db.query(
        'SELECT id, status FROM public.rent_payments ORDER BY id',
      )

      const statusesById = Object.fromEntries(rows.map((row) => [row.id, row.status]))
      expect(statusesById[seed.tenantPaymentId]).toBe('pending')
      expect(statusesById[seed.roommatePaymentId]).toBe('succeeded')
    })
  })

  describe('notifications policies', () => {
    it('allows users to view only their notifications', async () => {
      const [tenant, roommate] = seed.tenants

      const tenantRows = await harness.withAuthContext(tenant, async () => {
        const { rows } = await harness.db.query(
          'SELECT id, user_id FROM public.notifications ORDER BY created_at',
        )
        return rows
      })

      expect(tenantRows).toEqual([
        expect.objectContaining({ id: seed.tenantNotificationId, user_id: tenant.id }),
      ])

      const roommateRows = await harness.withAuthContext(roommate, async () => {
        const { rows } = await harness.db.query(
          'SELECT id, user_id FROM public.notifications ORDER BY created_at',
        )
        return rows
      })

      expect(roommateRows).toEqual([
        expect.objectContaining({ id: seed.roommateNotificationId, user_id: roommate.id }),
      ])

      const managerRows = await harness.withAuthContext(seed.manager, async () => {
        const { rows } = await harness.db.query(
          'SELECT id FROM public.notifications ORDER BY created_at',
        )
        return rows
      })

      expect(managerRows).toEqual([
        expect.objectContaining({ id: seed.managerNotificationId }),
      ])
    })

    it('allows users to mark their own notifications as read', async () => {
      const [tenant] = seed.tenants

      await harness.withAuthContext(tenant, async () => {
        await harness.db.query(
          `UPDATE public.notifications SET read = true WHERE id = $1`,
          [seed.tenantNotificationId],
        )
      })

      const { rows } = await harness.db.query(
        'SELECT read FROM public.notifications WHERE id = $1',
        [seed.tenantNotificationId],
      )

      expect(rows[0]?.read).toBe(true)
    })

    it('prevents users from updating notifications they do not own', async () => {
      const [tenant, roommate] = seed.tenants

      const roommateResult = await harness.withAuthContext(tenant, async () =>
        harness.db.query(
          `UPDATE public.notifications SET read = true WHERE id = $1`,
          [seed.roommateNotificationId],
        ),
      )

      expect(roommateResult.affectedRows).toBe(0)

      const managerResult = await harness.withAuthContext(tenant, async () =>
        harness.db.query(
          `UPDATE public.notifications SET read = true WHERE id = $1`,
          [seed.managerNotificationId],
        ),
      )

      expect(managerResult.affectedRows).toBe(0)

      const { rows } = await harness.db.query(
        'SELECT read FROM public.notifications WHERE id = ANY($1)',
        [[seed.roommateNotificationId, seed.managerNotificationId]],
      )

      expect(rows.map((row) => row.read)).toEqual([false, false])
    })
  })

  describe('email_notifications policies', () => {
    it('restricts email notification visibility to the owner', async () => {
      const [tenant, roommate] = seed.tenants

      const tenantRows = await harness.withAuthContext(tenant, async () => {
        const { rows } = await harness.db.query(
          'SELECT id, user_id FROM public.email_notifications ORDER BY sent_at',
        )
        return rows
      })

      expect(tenantRows).toEqual([
        expect.objectContaining({ id: seed.tenantEmailNotificationId, user_id: tenant.id }),
      ])

      const roommateRows = await harness.withAuthContext(roommate, async () => {
        const { rows } = await harness.db.query(
          'SELECT id, user_id FROM public.email_notifications ORDER BY sent_at',
        )
        return rows
      })

      expect(roommateRows).toEqual([
        expect.objectContaining({ id: seed.roommateEmailNotificationId, user_id: roommate.id }),
      ])

      const managerRows = await harness.withAuthContext(seed.manager, async () => {
        const { rows } = await harness.db.query(
          'SELECT id FROM public.email_notifications ORDER BY sent_at',
        )
        return rows
      })

      expect(managerRows).toEqual([])
    })
  })
})
