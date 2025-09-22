import { loadEnvConfig } from '@next/env'
import { createClient, type PostgrestError } from '@supabase/supabase-js'

loadEnvConfig(process.cwd())

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const columnCache = new Map<string, Set<string>>()

const buildingId = 'dbb43b8d-33cf-4964-afac-01721f5fd23e'
const householdId = 'e603ebc6-d610-4d12-bc4a-6ef3e8a3aa54'
const leaseId = 'e1330cd3-5053-4a87-9955-25ad782b9cd4'

const now = new Date().toISOString()
const iso = (date: string) => new Date(date).toISOString()

const householdRow = {
  id: householdId,
  building_id: buildingId,
  slug: 'harbor-house-coop',
  name: 'Harbor House Co-op',
  nickname: 'Unit 3A',
  address_line1: '123 Harbor View Ave',
  city: 'Seattle',
  state: 'WA',
  postal_code: '98101',
  timezone: 'America/Los_Angeles',
  status: 'active',
  created_at: now,
  updated_at: now,
}

const householdMembers = [
  {
    id: '7cadfc8c-20d5-4238-8933-b2653141aefa',
    building_id: buildingId,
    household_id: householdId,
    full_name: 'Avery Johnson',
    preferred_name: 'Avery',
    email: 'avery.johnson@example.com',
    phone: '+1-555-0101',
    role: 'resident',
    rent_share: 850,
    is_primary: true,
    move_in_date: iso('2023-08-01'),
    created_at: now,
    updated_at: now,
  },
  {
    id: 'b85e9b41-e666-41e0-be29-8757fd24ddc4',
    building_id: buildingId,
    household_id: householdId,
    full_name: 'Blair Morgan',
    preferred_name: 'Blair',
    email: 'blair.morgan@example.com',
    phone: '+1-555-0102',
    role: 'resident',
    rent_share: 800,
    is_primary: false,
    move_in_date: iso('2023-09-15'),
    created_at: now,
    updated_at: now,
  },
  {
    id: '8b368283-ef12-4409-8e53-ec05bfa87bd4',
    building_id: buildingId,
    household_id: householdId,
    full_name: 'Casey Nguyen',
    preferred_name: 'Casey',
    email: 'casey.nguyen@example.com',
    phone: '+1-555-0103',
    role: 'resident',
    rent_share: 775,
    is_primary: false,
    move_in_date: iso('2023-11-01'),
    created_at: now,
    updated_at: now,
  },
  {
    id: '23d79425-9089-4acf-b7f7-76f600742a5f',
    building_id: buildingId,
    household_id: householdId,
    full_name: 'Devon Patel',
    preferred_name: 'Devon',
    email: 'devon.patel@example.com',
    phone: '+1-555-0104',
    role: 'resident',
    rent_share: 775,
    is_primary: false,
    move_in_date: iso('2024-01-05'),
    created_at: now,
    updated_at: now,
  },
]

const amenities = [
  {
    id: '84e20659-ce1a-4204-825d-8845c0d2cf64',
    building_id: buildingId,
    household_id: householdId,
    slug: 'chef-kitchen',
    name: 'Chef Kitchen',
    category: 'kitchen',
    description: 'Induction range, double ovens, and prep island stocked for meal prep nights.',
    booking_required: true,
    access_notes: 'Reserve via portal; wipe surfaces and run dishwasher after use.',
    created_at: now,
    updated_at: now,
  },
  {
    id: 'e4e64814-42b0-49e4-87be-dd62d9e77f33',
    building_id: buildingId,
    household_id: householdId,
    slug: 'laundry-station',
    name: 'Laundry Station',
    category: 'laundry',
    description: 'High-capacity washer/dryer with folding table and shared supplies.',
    booking_required: false,
    access_notes: 'Use signup board for weekend slots; leave supplies stocked.',
    created_at: now,
    updated_at: now,
  },
  {
    id: '6675911b-b7cb-42b4-a464-2012043693f6',
    building_id: buildingId,
    household_id: householdId,
    slug: 'media-den',
    name: 'Media Den',
    category: 'media',
    description: 'Projector, surround sound, and gaming consoles for group movie nights.',
    booking_required: true,
    access_notes: 'Limit sessions to 3 hours; log any new streaming purchases.',
    created_at: now,
    updated_at: now,
  },
  {
    id: '60d209c9-c8dc-45c9-a587-55b15d918ea8',
    building_id: buildingId,
    household_id: householdId,
    slug: 'rooftop-garden',
    name: 'Rooftop Garden',
    category: 'outdoor',
    description: 'Shared herb planters, lounge seating, and grill with storage for tools.',
    booking_required: false,
    access_notes: 'Quiet hours after 10pm; log grill propane levels weekly.',
    created_at: now,
    updated_at: now,
  },
  {
    id: 'e8007543-28f7-4aa0-b02d-84256d720d0d',
    building_id: buildingId,
    household_id: householdId,
    slug: 'parking-bay-2',
    name: 'Parking Bay 2',
    category: 'parking',
    description: 'Assigned EV-ready parking bay with shared charging schedule.',
    booking_required: true,
    access_notes: 'Submit vehicle plate updates before swapping cars.',
    created_at: now,
    updated_at: now,
  },
]

const leaseRow = {
  id: leaseId,
  building_id: buildingId,
  household_id: householdId,
  start_date: iso('2024-01-01'),
  end_date: iso('2024-12-31'),
  rent_amount: 3200,
  security_deposit: 3200,
  rent_due_day: 1,
  status: 'active',
  document_url: 'https://example.com/docs/harbor-house-lease.pdf',
  created_at: now,
  updated_at: now,
}

const chores = [
  {
    id: '5b19bc91-3eca-4515-aedc-e4ebb8df1160',
    building_id: buildingId,
    household_id: householdId,
    title: 'Kitchen reset',
    description: 'Sanitize countertops, restock shared pantry bins, and run dishwasher if needed.',
    frequency: 'weekly',
    weekday: 'monday',
    created_at: now,
    updated_at: now,
  },
  {
    id: 'a1f8a6e1-849d-42ef-a3e0-f4e1f9ec64c9',
    building_id: buildingId,
    household_id: householdId,
    title: 'Trash & recycling',
    description: 'Empty interior bins, consolidate compost, and wheel carts to curb.',
    frequency: 'weekly',
    weekday: 'wednesday',
    created_at: now,
    updated_at: now,
  },
  {
    id: '3d2637c8-9bcf-4beb-a9e5-345bee446855',
    building_id: buildingId,
    household_id: householdId,
    title: 'Bathroom refresh',
    description: 'Clean sinks, mirrors, and restock shared toiletries.',
    frequency: 'weekly',
    weekday: 'friday',
    created_at: now,
    updated_at: now,
  },
  {
    id: '2a72b418-3e83-429e-96be-7d5637bb3128',
    building_id: buildingId,
    household_id: householdId,
    title: 'Common area tidy',
    description: 'Vacuum living room, wipe coffee table, and reset mail organizer.',
    frequency: 'weekly',
    weekday: 'sunday',
    created_at: now,
    updated_at: now,
  },
]

const assignments = [
  {
    id: 'c3c45c28-1ec8-4de9-a070-c7cba1bfb84f',
    building_id: buildingId,
    household_id: householdId,
    chore_id: '5b19bc91-3eca-4515-aedc-e4ebb8df1160',
    household_member_id: '7cadfc8c-20d5-4238-8933-b2653141aefa',
    assigned_for: iso('2024-06-24'),
    due_date: iso('2024-06-30'),
    status: 'assigned',
    created_at: now,
    updated_at: now,
  },
  {
    id: '4452c3b9-08b1-4887-b4c9-05508655e3a8',
    building_id: buildingId,
    household_id: householdId,
    chore_id: 'a1f8a6e1-849d-42ef-a3e0-f4e1f9ec64c9',
    household_member_id: 'b85e9b41-e666-41e0-be29-8757fd24ddc4',
    assigned_for: iso('2024-06-24'),
    due_date: iso('2024-07-01'),
    status: 'assigned',
    created_at: now,
    updated_at: now,
  },
  {
    id: '18cefc0b-82e9-49ad-8e1c-6a55f77b0a9b',
    building_id: buildingId,
    household_id: householdId,
    chore_id: '3d2637c8-9bcf-4beb-a9e5-345bee446855',
    household_member_id: '8b368283-ef12-4409-8e53-ec05bfa87bd4',
    assigned_for: iso('2024-06-24'),
    due_date: iso('2024-07-02'),
    status: 'assigned',
    created_at: now,
    updated_at: now,
  },
  {
    id: '970b2827-f099-4e1f-9ae7-3e2c6b894ed6',
    building_id: buildingId,
    household_id: householdId,
    chore_id: '2a72b418-3e83-429e-96be-7d5637bb3128',
    household_member_id: '23d79425-9089-4acf-b7f7-76f600742a5f',
    assigned_for: iso('2024-06-24'),
    due_date: iso('2024-07-03'),
    status: 'assigned',
    created_at: now,
    updated_at: now,
  },
]

async function getColumnSet(table: string): Promise<Set<string>> {
  if (columnCache.has(table)) {
    return columnCache.get(table) as Set<string>
  }

  const { data, error } = await supabase
    .schema('information_schema')
    .from('columns')
    .select('column_name')
    .eq('table_schema', 'public')
    .eq('table_name', table)

  if (error) {
    throw new Error(`Unable to inspect columns for "${table}": ${error.message}`)
  }

  const columnNames = (data ?? [])
    .map(entry => entry.column_name)
    .filter((name): name is string => Boolean(name))

  if (columnNames.length === 0) {
    throw new Error(`Table "${table}" was not found. Run migrations before seeding.`)
  }

  const columnSet = new Set(columnNames)
  columnCache.set(table, columnSet)
  return columnSet
}

function filterRow(row: Record<string, unknown>, columns: Set<string>) {
  return Object.fromEntries(
    Object.entries(row).filter(([key, value]) => value !== undefined && columns.has(key))
  )
}

function handlePostgrestError(table: string, error: PostgrestError): never {
  if (error.code === '42P01') {
    throw new Error(`Table "${table}" does not exist. Apply the latest Supabase migrations and try again.`)
  }

  throw new Error(`Failed to seed ${table}: ${error.message}`)
}

async function upsertRows(table: string, rows: Record<string, unknown>[], label: string) {
  if (rows.length === 0) {
    console.log(`Skipping ${label}; no rows provided.`)
    return
  }

  const columns = await getColumnSet(table)

  if (!columns.has('id')) {
    throw new Error(`Table "${table}" must expose an 'id' column for deterministic seeding.`)
  }

  const payload = rows.map(row => filterRow(row, columns))

  const { error } = await supabase
    .from(table)
    .upsert(payload, { onConflict: 'id', ignoreDuplicates: false, returning: 'minimal' })

  if (error) {
    handlePostgrestError(table, error)
  }

  console.log(`✓ Seeded ${label}`)
}

async function run() {
  try {
    console.log('Seeding demo household data...')

    await upsertRows('households', [householdRow], 'household record')
    await upsertRows('household_members', householdMembers, 'household members')
    await upsertRows('amenities', amenities, 'amenities')
    await upsertRows('leases', [leaseRow], 'lease')
    await upsertRows('chores', chores, 'chores')
    await upsertRows('chore_assignments', assignments, 'chore assignments')

    console.log('Demo dataset ready!')
  } catch (error) {
    console.error((error as Error).message)
    process.exitCode = 1
  }
}

run()
