import { describe, expect, it } from "vitest"
import { PGlite } from "@electric-sql/pglite"
import { readFileSync } from "node:fs"
import path from "node:path"

const migrationSql = readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/20250214_rent_payments_denorm.sql",
  ),
  "utf8",
)

const baseSchemaSql = `
  CREATE TABLE public.profiles (
    id uuid PRIMARY KEY,
    full_name text,
    unit_id uuid
  );

  CREATE TABLE public.units (
    id uuid PRIMARY KEY,
    label text,
    name text,
    unit_label text,
    unit_number text,
    code text
  );

  CREATE TABLE public.rent_payments (
    id uuid PRIMARY KEY,
    user_id uuid,
    tenant_id uuid,
    unit_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    payer_name text,
    unit text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );

  CREATE OR REPLACE FUNCTION public.touch_rent_payments_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $$
  BEGIN
    NEW.updated_at := now();
    RETURN NEW;
  END;
  $$;

  CREATE TRIGGER update_rent_payments_updated_at
  BEFORE UPDATE ON public.rent_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_rent_payments_updated_at();
`

async function createDatabase() {
  const db = await PGlite.create()
  await db.exec(baseSchemaSql)
  return db
}

describe("rent_payments denormalization", () => {
  const userId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

  it("populates payer_name and unit using metadata fallbacks for new payments", async () => {
    const db = await createDatabase()
    try {
      await db.exec(migrationSql)

      const cases = [
        {
          id: "00000000-0000-0000-0000-000000000001",
          metadata: { payer_name: "Metadata Payer", unit_label: "Unit A" },
          expected: { payer_name: "Metadata Payer", unit: "Unit A" },
        },
        {
          id: "00000000-0000-0000-0000-000000000002",
          metadata: { tenant_name: "Tenant Meta", unit: "B-2" },
          expected: { payer_name: "Tenant Meta", unit: "B-2" },
        },
        {
          id: "00000000-0000-0000-0000-000000000003",
          metadata: { customer_name: "Customer Meta", unit_number: "303" },
          expected: { payer_name: "Customer Meta", unit: "303" },
        },
      ] as const

      for (const sample of cases) {
        await db.query(
          `
            INSERT INTO public.rent_payments (id, user_id, metadata)
            VALUES ($1::uuid, $2::uuid, $3::jsonb);
          `,
          [sample.id, userId, JSON.stringify(sample.metadata)],
        )

        const { rows } = await db.query(
          `
            SELECT payer_name, unit
            FROM public.rent_payments
            WHERE id = $1::uuid;
          `,
          [sample.id],
        )

        expect(rows[0]).toMatchObject(sample.expected)
      }
    } finally {
      await db.close()
    }
  })

  it("derives payer_name and unit from linked profile data when metadata is missing", async () => {
    const db = await createDatabase()
    try {
      await db.exec(migrationSql)

      const unitId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
      const profileId = "cccccccc-cccc-cccc-cccc-cccccccccccc"
      const otherUserId = "dddddddd-dddd-dddd-dddd-dddddddddddd"

      await db.query(
        `
          INSERT INTO public.units (id, label, code)
          VALUES ($1::uuid, $2, $3);
        `,
        [unitId, "Loft 5", "L5"],
      )

      await db.query(
        `
          INSERT INTO public.profiles (id, full_name, unit_id)
          VALUES ($1::uuid, $2, $3::uuid);
        `,
        [profileId, "Harper Tenant", unitId],
      )

      const emptyMetadataPaymentId = "00000000-0000-0000-0000-000000000004"
      await db.query(
        `
          INSERT INTO public.rent_payments (id, user_id, metadata)
          VALUES ($1::uuid, $2::uuid, $3::jsonb);
        `,
        [emptyMetadataPaymentId, profileId, JSON.stringify({})],
      )

      const metadataTenantIdPaymentId = "00000000-0000-0000-0000-000000000005"
      await db.query(
        `
          INSERT INTO public.rent_payments (id, user_id, metadata)
          VALUES ($1::uuid, $2::uuid, $3::jsonb);
        `,
        [
          metadataTenantIdPaymentId,
          otherUserId,
          JSON.stringify({ tenant_id: profileId }),
        ],
      )

      const { rows: profileRows } = await db.query(
        `
          SELECT payer_name, unit
          FROM public.rent_payments
          WHERE id IN ($1::uuid, $2::uuid)
          ORDER BY id;
        `,
        [emptyMetadataPaymentId, metadataTenantIdPaymentId],
      )

      expect(profileRows).toEqual([
        { payer_name: "Harper Tenant", unit: "Loft 5" },
        { payer_name: "Harper Tenant", unit: "Loft 5" },
      ])
    } finally {
      await db.close()
    }
  })

  it("backfill populates legacy rows without changing updated_at", async () => {
    const db = await createDatabase()
    try {
      const unitId = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"
      const profileId = "ffffffff-ffff-ffff-ffff-ffffffffffff"
      const otherUserId = "11111111-1111-1111-1111-111111111111"

      await db.query(
        `
          INSERT INTO public.units (id, label, code)
          VALUES ($1::uuid, $2, $3);
        `,
        [unitId, "Penthouse 9", "P9"],
      )

      await db.query(
        `
          INSERT INTO public.profiles (id, full_name, unit_id)
          VALUES ($1::uuid, $2, $3::uuid);
        `,
        [profileId, "Legacy Profile", unitId],
      )

      const legacyRows = [
        {
          id: "00000000-0000-0000-0000-000000000006",
          userId: profileId,
          metadata: {},
          expected: { payer_name: "Legacy Profile", unit: "Penthouse 9" },
          updatedAt: "2024-01-01T05:00:00.000Z",
        },
        {
          id: "00000000-0000-0000-0000-000000000007",
          userId: otherUserId,
          metadata: { tenant_name: "Metadata Legacy", unit_number: "204" },
          expected: { payer_name: "Metadata Legacy", unit: "204" },
          updatedAt: "2024-02-15T15:30:00.000Z",
        },
      ] as const

      for (const row of legacyRows) {
        await db.query(
          `
            INSERT INTO public.rent_payments (id, user_id, metadata, payer_name, unit, updated_at)
            VALUES ($1::uuid, $2::uuid, $3::jsonb, NULL, NULL, $4::timestamptz);
          `,
          [row.id, row.userId, JSON.stringify(row.metadata), row.updatedAt],
        )
      }

      await db.exec(migrationSql)

      const { rows } = await db.query(
        `
          SELECT id, payer_name, unit, updated_at
          FROM public.rent_payments
          WHERE id IN ($1::uuid, $2::uuid)
          ORDER BY id;
        `,
        legacyRows.map((row) => row.id),
      )

      expect(rows).toHaveLength(legacyRows.length)

      rows.forEach((row, index) => {
        const expected = legacyRows[index]
        expect(row.payer_name).toBe(expected.expected.payer_name)
        expect(row.unit).toBe(expected.expected.unit)
        expect(new Date(row.updated_at).toISOString()).toBe(expected.updatedAt)
      })
    } finally {
      await db.close()
    }
  })
})
