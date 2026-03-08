import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const policyMigrationPath = 'supabase/migrations/20250305_rls_write_hardening.sql'

const sql = readFileSync(policyMigrationPath, 'utf8')

describe('RLS write hardening policies', () => {
  it('prevents resurrecting the old unconstrained maintenance update policy', () => {
    expect(sql).not.toMatch(/CREATE POLICY "Property managers can update maintenance requests"/)
  })

  it('restricts tenants to their own maintenance requests', () => {
    expect(sql).toMatch(
      /CREATE POLICY "Tenants update their maintenance requests"[\s\S]+WITH CHECK \(auth\.uid\(\) = requested_by\);/
    )
  })

  it('limits manager maintenance updates to scoped rows', () => {
    expect(sql).toMatch(/Managers maintain scoped maintenance requests/)
    expect(sql).toMatch(/manager\.role IN \('property_manager', 'admin'\)/)
    expect(sql).toMatch(/manager\.unit_id = maintenance_requests\.unit_id/)
  })

  it('requires service role checks for maintenance mutations', () => {
    expect(sql).toMatch(/Service role maintains maintenance requests[\s\S]+auth\.role\(\) = 'service_role'/)
    expect(sql).toMatch(/Service role updates maintenance requests[\s\S]+auth\.role\(\) = 'service_role'/)
  })

  it('guards visitor log writes by tenancy and role scope', () => {
    expect(sql).toMatch(/Tenants update their visitor logs[\s\S]+WITH CHECK \(auth\.uid\(\) = host_id\);/)
    expect(sql).toMatch(/Managers maintain scoped visitor logs/)
    expect(sql).toMatch(/manager\.unit_id IS NOT DISTINCT FROM host\.unit_id/)
    expect(sql).toMatch(/Service role updates visitor logs[\s\S]+auth\.role\(\) = 'service_role'/)
  })

  it('ensures notifications updates keep ownership intact', () => {
    expect(sql).toMatch(/Users can update their own notifications[\s\S]+WITH CHECK \(auth\.uid\(\) = user_id\);/)
    expect(sql).toMatch(/Service role manages notifications[\s\S]+auth\.role\(\) = 'service_role'/)
  })

  it('enforces tenant scoped rent payment writes', () => {
    expect(sql).toMatch(/Tenants create their rent payments[\s\S]+WITH CHECK \(auth\.uid\(\) = user_id\);/)
    expect(sql).toMatch(/Tenants update their rent payments[\s\S]+WITH CHECK \(auth\.uid\(\) = user_id\);/)
  })

  it('constrains manager rent payment updates to managed units', () => {
    expect(sql).toMatch(/Managers update scoped rent payments/)
    expect(sql).toMatch(/tenant_profile\.id = COALESCE\(rent_payments\.tenant_id, rent_payments\.user_id\)/)
    expect(sql).toMatch(/manager\.unit_id IS NOT DISTINCT FROM rent_payments\.unit_id/)
  })

  it('requires service role checks for rent payment mutations', () => {
    expect(sql).toMatch(/Service role manages rent payments[\s\S]+auth\.role\(\) = 'service_role'/)
    expect(sql).toMatch(/Service role updates rent payments[\s\S]+auth\.role\(\) = 'service_role'/)
  })

  it('locks subscription writes to the owning tenant and scoped managers', () => {
    expect(sql).toMatch(/Tenants create their subscriptions[\s\S]+WITH CHECK \(auth\.uid\(\) = user_id\);/)
    expect(sql).toMatch(/Managers update scoped subscriptions/)
    expect(sql).toMatch(/tenant_profile\.id = subscriptions\.user_id/)
  })

  it('applies service role gates to subscriptions and email notifications', () => {
    expect(sql).toMatch(/Service role manages subscriptions[\s\S]+auth\.role\(\) = 'service_role'/)
    expect(sql).toMatch(/Service role updates subscriptions[\s\S]+auth\.role\(\) = 'service_role'/)
    expect(sql).toMatch(/Service role creates email notifications[\s\S]+auth\.role\(\) = 'service_role'/)
  })
})
