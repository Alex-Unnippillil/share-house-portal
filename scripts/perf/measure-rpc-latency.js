#!/usr/bin/env node
const { newDb } = require('pg-mem')
const { performance } = require('perf_hooks')
const { randomUUID } = require('crypto')

function createDatabase() {
  const db = newDb({ autoCreateForeignKeyIndices: true })

  // Stabilise NOW() for deterministic measurements
  const fixedNow = new Date('2025-01-08T10:00:00Z')
  db.public.registerFunction({
    name: 'now',
    returns: 'timestamp',
    impure: true,
    implementation: () => new Date(fixedNow.getTime()),
  })

  db.public.registerFunction({
    name: 'gen_random_uuid',
    returns: 'uuid',
    implementation: () => randomUUID(),
  })

  const schemaSql = `
    CREATE TABLE public.households (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE public.profiles (
      id UUID PRIMARY KEY,
      full_name TEXT,
      username TEXT,
      role TEXT DEFAULT 'tenant'
    );

    CREATE TABLE public.amenities (
      id UUID PRIMARY KEY,
      household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      slot_duration_minutes INTEGER NOT NULL DEFAULT 60,
      buffer_minutes INTEGER NOT NULL DEFAULT 0,
      open_hour INTEGER NOT NULL DEFAULT 8,
      close_hour INTEGER NOT NULL DEFAULT 22,
      max_advance_days INTEGER NOT NULL DEFAULT 14,
      timezone TEXT NOT NULL DEFAULT 'UTC'
    );

    CREATE TABLE public.amenity_bookings (
      id UUID PRIMARY KEY,
      amenity_id UUID NOT NULL REFERENCES public.amenities(id) ON DELETE CASCADE,
      household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
      start_time TIMESTAMPTZ NOT NULL,
      end_time TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed'
    );

    CREATE TABLE public.rpc_available_slots (
      amenity_slug TEXT NOT NULL,
      household_id UUID NOT NULL,
      slot_start TIMESTAMPTZ NOT NULL,
      slot_end TIMESTAMPTZ NOT NULL,
      is_peak BOOLEAN NOT NULL,
      PRIMARY KEY (amenity_slug, household_id, slot_start)
    );

    CREATE TABLE public.roommate_balances (
      id UUID PRIMARY KEY,
      roommate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
      unit_label TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      monthly_share NUMERIC(12, 2) NOT NULL,
      autopay_day INTEGER NOT NULL DEFAULT 1,
      autopay_status TEXT NOT NULL DEFAULT 'active',
      last_payment_date DATE,
      last_payment_amount NUMERIC(12, 2),
      metadata JSONB DEFAULT '{}'::JSONB
    );

    CREATE TABLE public.roommate_charges (
      id UUID PRIMARY KEY,
      balance_id UUID NOT NULL REFERENCES public.roommate_balances(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      due_date DATE NOT NULL,
      original_amount NUMERIC(12, 2) NOT NULL,
      outstanding_amount NUMERIC(12, 2) NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE public.rpc_next_due_invoices (
      balance_id UUID PRIMARY KEY,
      household_id UUID NOT NULL,
      roommate_id UUID NOT NULL,
      roommate_name TEXT NOT NULL,
      unit_label TEXT NOT NULL,
      currency TEXT NOT NULL,
      monthly_share NUMERIC(12, 2) NOT NULL,
      autopay_day INTEGER NOT NULL,
      autopay_status TEXT NOT NULL,
      last_payment_date DATE,
      last_payment_amount NUMERIC(12, 2),
      metadata JSONB,
      outstanding_total NUMERIC(12, 2) NOT NULL,
      next_charge JSONB,
      charges JSONB NOT NULL
    );
  `

  db.public.none(schemaSql)

  const rpcSql = `
    CREATE OR REPLACE FUNCTION public.get_available_amenity_slots(
      p_amenity_slug TEXT,
      p_household_id UUID DEFAULT NULL,
      p_range_start TIMESTAMPTZ DEFAULT now(),
      p_range_end TIMESTAMPTZ DEFAULT now() + INTERVAL '7 days'
    )
    RETURNS TABLE (
      slot_start TIMESTAMPTZ,
      slot_end TIMESTAMPTZ,
      is_peak BOOLEAN
    )
    LANGUAGE sql
    AS $$
      SELECT
        slot_start,
        slot_end,
        is_peak
      FROM public.rpc_available_slots
      WHERE amenity_slug = p_amenity_slug
        AND (p_household_id IS NULL OR household_id = p_household_id)
        AND slot_start >= p_range_start
        AND slot_end <= p_range_end
      ORDER BY slot_start;
    $$;

    CREATE OR REPLACE FUNCTION public.get_next_due_invoices(
      p_household_id UUID DEFAULT NULL,
      p_roommate_id UUID DEFAULT NULL
    )
    RETURNS TABLE (
      balance_id UUID,
      roommate_id UUID,
      roommate_name TEXT,
      unit_label TEXT,
      currency TEXT,
      monthly_share NUMERIC(12, 2),
      autopay_day INTEGER,
      autopay_status TEXT,
      last_payment_date DATE,
      last_payment_amount NUMERIC(12, 2),
      metadata JSONB,
      outstanding_total NUMERIC(12, 2),
      next_charge JSONB,
      charges JSONB
    )
    LANGUAGE sql
    AS $$
      SELECT
        balance_id,
        roommate_id,
        roommate_name,
        unit_label,
        currency,
        monthly_share,
        autopay_day,
        autopay_status,
        last_payment_date,
        last_payment_amount,
        metadata,
        outstanding_total,
        next_charge,
        charges
      FROM public.rpc_next_due_invoices
      WHERE (p_household_id IS NULL OR household_id = p_household_id)
        AND (p_roommate_id IS NULL OR roommate_id = p_roommate_id)
      ORDER BY outstanding_total DESC, roommate_name;
    $$;
  `

  db.public.none(rpcSql)

  return db
}

async function seedData(pool) {
  const householdId = '00000000-0000-0000-0000-000000000001'
  const amenityId = '00000000-0000-0000-0000-000000000010'
  const roommateA = '00000000-0000-0000-0000-000000000101'
  const roommateB = '00000000-0000-0000-0000-000000000102'
  const balanceA = '00000000-0000-0000-0000-000000000201'
  const balanceB = '00000000-0000-0000-0000-000000000202'

  await pool.query(
    `INSERT INTO public.households (id, name) VALUES ($1, $2);`,
    [householdId, 'Test Household']
  )

  await pool.query(
    `INSERT INTO public.profiles (id, full_name, username, role) VALUES ($1, $2, $3, $4), ($5, $6, $7, $4);`,
    [
      roommateA,
      'Avery Tenant',
      'avery',
      'tenant',
      roommateB,
      'Blake Roomie',
      'blake',
    ]
  )

  await pool.query(
    `INSERT INTO public.amenities (
      id, household_id, slug, name, slot_duration_minutes, buffer_minutes, open_hour, close_hour, max_advance_days, timezone
    ) VALUES ($1, $2, 'kitchen', 'Kitchen', 60, 15, 8, 22, 14, 'UTC');`,
    [amenityId, householdId]
  )

  const bookingRows = [
    {
      start: '2025-01-08T17:00:00Z',
      end: '2025-01-08T18:00:00Z',
    },
    {
      start: '2025-01-08T19:15:00Z',
      end: '2025-01-08T20:15:00Z',
    },
    {
      start: '2025-01-09T09:00:00Z',
      end: '2025-01-09T10:30:00Z',
    },
  ]

  for (const row of bookingRows) {
    await pool.query(
      `INSERT INTO public.amenity_bookings (id, amenity_id, household_id, start_time, end_time, status)
       VALUES ($1, $2, $3, $4, $5, 'confirmed');`,
      [randomUUID(), amenityId, householdId, row.start, row.end]
    )
  }

  await pool.query(
    `INSERT INTO public.roommate_balances (
      id, roommate_id, household_id, unit_label, currency, monthly_share, autopay_day, autopay_status, last_payment_date, last_payment_amount, metadata
    ) VALUES
      ($1, $3, $2, 'Unit 1A', 'USD', 1200.00, 1, 'active', '2024-12-28', 1200.00, '{"notifications": true}'),
      ($4, $5, $2, 'Unit 1A', 'USD', 1150.00, 1, 'paused', '2024-12-15', 575.00, '{"notifications": false}');`,
    [balanceA, householdId, roommateA, balanceB, roommateB]
  )

  const charges = [
    {
      id: randomUUID(),
      balance: balanceA,
      description: 'January Rent',
      category: 'rent',
      due: '2025-01-05',
      original: 1200.0,
      outstanding: 600.0,
      status: 'partial',
      created: '2024-12-15T10:00:00Z',
    },
    {
      id: randomUUID(),
      balance: balanceA,
      description: 'Utilities',
      category: 'utilities',
      due: '2025-01-08',
      original: 120.0,
      outstanding: 120.0,
      status: 'open',
      created: '2024-12-20T10:00:00Z',
    },
    {
      id: randomUUID(),
      balance: balanceB,
      description: 'January Rent',
      category: 'rent',
      due: '2025-01-05',
      original: 1150.0,
      outstanding: 1150.0,
      status: 'open',
      created: '2024-12-10T10:00:00Z',
    },
  ]

  for (const charge of charges) {
    await pool.query(
      `INSERT INTO public.roommate_charges (
        id, balance_id, description, category, due_date, original_amount, outstanding_amount, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
      [
        charge.id,
        charge.balance,
        charge.description,
        charge.category,
        charge.due,
        charge.original,
        charge.outstanding,
        charge.status,
        charge.created,
      ]
    )
  }

  return {
    householdId,
    amenityId,
    roommateA,
    roommateB,
  }
}

async function computeClientSideAmenitySlots(pool, slug, householdId, rangeStart, rangeEnd) {
  const amenityRes = await pool.query(
    `SELECT * FROM public.amenities WHERE slug = $1 AND household_id = $2 LIMIT 1;`,
    [slug, householdId]
  )
  const amenity = amenityRes.rows[0]
  if (!amenity) throw new Error('Amenity not found in client calculation')

  const bookingsRes = await pool.query(
    `SELECT start_time, end_time FROM public.amenity_bookings
      WHERE amenity_id = $1
        AND status IN ('pending', 'confirmed')
        AND start_time < $3
        AND end_time > $2;`,
    [amenity.id, rangeStart, rangeEnd]
  )

  const bookings = bookingsRes.rows.map((row) => ({
    start: new Date(row.start_time).getTime(),
    end: new Date(row.end_time).getTime(),
  }))

  const slotDurationMs = amenity.slot_duration_minutes * 60 * 1000
  const bufferMs = amenity.buffer_minutes * 60 * 1000

  const slots = []
  const start = new Date(rangeStart)
  const end = new Date(rangeEnd)
  start.setUTCSeconds(0, 0)

  for (let time = start.getTime(); time <= end.getTime() - slotDurationMs; time += slotDurationMs) {
    const slotStart = new Date(time)
    const slotEnd = new Date(time + slotDurationMs)

    const startHour = slotStart.getUTCHours()
    const endHour = slotEnd.getUTCHours()
    if (startHour < amenity.open_hour || endHour > amenity.close_hour) continue

    const overlaps = bookings.some(
      (booking) => booking.start < slotEnd.getTime() + bufferMs && booking.end > slotStart.getTime() - bufferMs
    )

    if (!overlaps) {
      const isPeak = startHour >= 17 && startHour <= 21
      slots.push({
        slot_start: slotStart.toISOString(),
        slot_end: slotEnd.toISOString(),
        is_peak: isPeak,
      })
    }
  }

  return slots
}

async function populateRpcSlotTable(pool, slug, householdId, rangeStart, rangeEnd) {
  await pool.query(
    `DELETE FROM public.rpc_available_slots WHERE amenity_slug = $1 AND household_id = $2;`,
    [slug, householdId]
  )

  const slots = await computeClientSideAmenitySlots(pool, slug, householdId, rangeStart, rangeEnd)

  for (const slot of slots) {
    await pool.query(
      `INSERT INTO public.rpc_available_slots (
        amenity_slug, household_id, slot_start, slot_end, is_peak
      ) VALUES ($1, $2, $3, $4, $5);`,
      [slug, householdId, slot.slot_start, slot.slot_end, slot.is_peak]
    )
  }
}

async function populateRpcInvoiceTable(pool, householdId) {
  await pool.query(
    `DELETE FROM public.rpc_next_due_invoices WHERE household_id = $1;`,
    [householdId]
  )

  const invoices = await computeClientSideInvoices(pool, householdId)

  for (const invoice of invoices) {
    const chargesJson = invoice.charges.map((charge) => ({
      id: charge.id,
      description: charge.description,
      category: charge.category,
      due_date:
        charge.due_date instanceof Date
          ? charge.due_date.toISOString().slice(0, 10)
          : charge.due_date,
      original_amount: Number(charge.original_amount),
      outstanding_amount: Number(charge.outstanding_amount),
      status: charge.status,
    }))

    const nextChargeJson = invoice.next_charge
      ? {
          id: invoice.next_charge.id,
          description: invoice.next_charge.description,
          category: invoice.next_charge.category,
          due_date:
            invoice.next_charge.due_date instanceof Date
              ? invoice.next_charge.due_date.toISOString().slice(0, 10)
              : invoice.next_charge.due_date,
          original_amount: Number(invoice.next_charge.original_amount),
          outstanding_amount: Number(invoice.next_charge.outstanding_amount),
          status: invoice.next_charge.status,
        }
      : null

    await pool.query(
      `INSERT INTO public.rpc_next_due_invoices (
        balance_id,
        household_id,
        roommate_id,
        roommate_name,
        unit_label,
        currency,
        monthly_share,
        autopay_day,
        autopay_status,
        last_payment_date,
        last_payment_amount,
        metadata,
        outstanding_total,
        next_charge,
        charges
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      );`,
      [
        invoice.balance_id,
        householdId,
        invoice.roommate_id,
        invoice.roommate_name,
        invoice.unit_label,
        invoice.currency,
        invoice.monthly_share,
        invoice.autopay_day,
        invoice.autopay_status,
        invoice.last_payment_date,
        invoice.last_payment_amount,
        invoice.metadata,
        invoice.outstanding_total,
        nextChargeJson,
        chargesJson,
      ]
    )
  }
}

async function computeClientSideInvoices(pool, householdId) {
  const balancesRes = await pool.query(
    `SELECT b.*, p.full_name, p.username
     FROM public.roommate_balances b
     JOIN public.profiles p ON p.id = b.roommate_id
     WHERE b.household_id = $1;`,
    [householdId]
  )

  const balanceIds = balancesRes.rows.map((row) => row.id)
  const chargesRes = await pool.query(
    `SELECT * FROM public.roommate_charges WHERE balance_id = ANY($1::uuid[]);`,
    [balanceIds]
  )

  const chargesByBalance = chargesRes.rows.reduce((acc, row) => {
    const key = row.balance_id
    if (!acc[key]) acc[key] = []
    acc[key].push(row)
    return acc
  }, {})

  return balancesRes.rows.map((row) => {
    const charges = (chargesByBalance[row.id] || []).sort((a, b) => {
      const dueDiff = new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      if (dueDiff !== 0) return dueDiff
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })

    const outstandingTotal = charges
      .filter((charge) => charge.status === 'open' || charge.status === 'partial')
      .reduce((sum, charge) => sum + Number(charge.outstanding_amount), 0)

    const nextCharge = charges.find((charge) => charge.status === 'open' || charge.status === 'partial') || null

    return {
      balance_id: row.id,
      roommate_id: row.roommate_id,
      roommate_name: row.full_name || row.username || 'Roommate',
      unit_label: row.unit_label,
      currency: row.currency,
      monthly_share: Number(row.monthly_share),
      autopay_day: row.autopay_day,
      autopay_status: row.autopay_status,
      last_payment_date: row.last_payment_date ? row.last_payment_date.toISOString().slice(0, 10) : null,
      last_payment_amount: row.last_payment_amount ? Number(row.last_payment_amount) : null,
      metadata: row.metadata,
      outstanding_total: outstandingTotal,
      next_charge: nextCharge,
      charges,
    }
  })
}

async function measure(fn, iterations = 250, warmup = 25) {
  for (let i = 0; i < warmup; i++) {
    await fn()
  }

  const samples = []
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    await fn()
    const end = performance.now()
    samples.push(end - start)
  }

  const sum = samples.reduce((acc, value) => acc + value, 0)
  const avg = sum / samples.length
  const min = Math.min(...samples)
  const max = Math.max(...samples)

  return { avg, min, max }
}

async function main() {
  const db = createDatabase()
  const { Pool } = db.adapters.createPg()
  const pool = new Pool()

  const { householdId } = await seedData(pool)

  const rangeStart = '2025-01-08T08:00:00Z'
  const rangeEnd = '2025-01-09T22:00:00Z'

  await populateRpcSlotTable(pool, 'kitchen', householdId, rangeStart, rangeEnd)
  await populateRpcInvoiceTable(pool, householdId)

  const clientBookings = await measure(() =>
    computeClientSideAmenitySlots(pool, 'kitchen', householdId, rangeStart, rangeEnd)
  )
  const rpcBookings = await measure(() =>
    pool.query(
      `SELECT slot_start, slot_end, is_peak
       FROM public.rpc_available_slots
       WHERE amenity_slug = $1
         AND household_id = $2
         AND slot_start >= $3
         AND slot_end <= $4
       ORDER BY slot_start;`,
      ['kitchen', householdId, rangeStart, rangeEnd]
    )
  )

  const clientInvoices = await measure(() => computeClientSideInvoices(pool, householdId))
  const rpcInvoices = await measure(() =>
    pool.query(
      `SELECT *
       FROM public.rpc_next_due_invoices
       WHERE household_id = $1
       ORDER BY outstanding_total DESC, roommate_name;`,
      [householdId]
    )
  )

  await pool.end()

  const table = {
    'Bookings (client calculations)': `${clientBookings.avg.toFixed(3)} ms (min ${clientBookings.min.toFixed(3)}, max ${clientBookings.max.toFixed(3)})`,
    'Bookings (RPC)': `${rpcBookings.avg.toFixed(3)} ms (min ${rpcBookings.min.toFixed(3)}, max ${rpcBookings.max.toFixed(3)})`,
    'Invoices (client aggregations)': `${clientInvoices.avg.toFixed(3)} ms (min ${clientInvoices.min.toFixed(3)}, max ${clientInvoices.max.toFixed(3)})`,
    'Invoices (RPC)': `${rpcInvoices.avg.toFixed(3)} ms (min ${rpcInvoices.min.toFixed(3)}, max ${rpcInvoices.max.toFixed(3)})`,
  }

  console.log('Latency comparison (avg over 250 iterations)')
  console.table(table)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
