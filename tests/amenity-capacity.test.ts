import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest"
import { Client } from "pg"
import { fileURLToPath } from "node:url"
import fs from "node:fs"
import path from "node:path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PG_HOST = process.env.PGHOST ?? "127.0.0.1"
const PG_PORT = Number.parseInt(process.env.PGPORT ?? "5432", 10)
const PG_USER = process.env.PGUSER ?? "postgres"
const PG_PASSWORD = process.env.PGPASSWORD ?? "postgres"
const TEST_DATABASE = process.env.PGTEST_DB ?? "share_house_capacity_test"

let client: Client

async function runQuery(connection: Client, sql: string) {
  await connection.query(sql)
}

function loadCapacityMigration() {
  const migrationsDir = path.resolve(__dirname, "../supabase/migrations")
  const files = fs.readdirSync(migrationsDir)
  const capacityMigration = files.find((file) => file.includes("amenity_capacity"))

  if (!capacityMigration) {
    throw new Error("Expected amenity capacity migration to be present in supabase/migrations")
  }

  return fs.readFileSync(path.join(migrationsDir, capacityMigration), "utf8")
}

async function createDatabase() {
  const admin = new Client({ host: PG_HOST, port: PG_PORT, user: PG_USER, password: PG_PASSWORD, database: "postgres" })
  await admin.connect()
  await admin.query(`DROP DATABASE IF EXISTS ${TEST_DATABASE}`)
  await admin.query(`CREATE DATABASE ${TEST_DATABASE}`)
  await admin.end()
}

beforeAll(async () => {
  await createDatabase()
  client = new Client({ host: PG_HOST, port: PG_PORT, user: PG_USER, password: PG_PASSWORD, database: TEST_DATABASE })
  await client.connect()
  await runQuery(client, loadCapacityMigration())
})

afterAll(async () => {
  if (client) {
    await client.end()
  }

  const admin = new Client({ host: PG_HOST, port: PG_PORT, user: PG_USER, password: PG_PASSWORD, database: "postgres" })
  await admin.connect()
  await admin.query(`DROP DATABASE IF EXISTS ${TEST_DATABASE}`)
  await admin.end()
})

beforeEach(async () => {
  await client.query("TRUNCATE TABLE public.amenity_bookings RESTART IDENTITY CASCADE")
  await client.query("TRUNCATE TABLE public.amenities RESTART IDENTITY CASCADE")
})

async function createAmenity(capacity: number, name = "Community Amenity") {
  const { rows } = await client.query<{ id: string }>(
    "INSERT INTO public.amenities (name, capacity) VALUES ($1, $2) RETURNING id",
    [name, capacity],
  )

  return rows[0].id
}

function hourFrom(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000)
}

describe("amenity booking capacity guard", () => {
  test("allows bookings that stay within the amenity capacity", async () => {
    const amenityId = await createAmenity(4, "Kitchen")
    const start = new Date()
    const end = hourFrom(start, 1)

    const result = await client.query(
      "INSERT INTO public.amenity_bookings (amenity_id, start_time, end_time, attendee_count) VALUES ($1, $2, $3, $4) RETURNING attendee_count",
      [amenityId, start.toISOString(), end.toISOString(), 2],
    )

    expect(result.rowCount).toBe(1)
    expect(result.rows[0].attendee_count).toBe(2)
  })

  test("rejects bookings whose attendee count exceeds the amenity capacity", async () => {
    const amenityId = await createAmenity(3, "Game room")
    const start = new Date()
    const end = hourFrom(start, 1)

    await expect(
      client.query(
        "INSERT INTO public.amenity_bookings (amenity_id, start_time, end_time, attendee_count) VALUES ($1, $2, $3, $4)",
        [amenityId, start.toISOString(), end.toISOString(), 5],
      ),
    ).rejects.toThrow(/capacity/i)
  })

  test("prevents overlapping bookings when combined attendees exceed capacity", async () => {
    const amenityId = await createAmenity(3, "Media room")
    const start = new Date()
    const end = hourFrom(start, 1)

    await client.query(
      "INSERT INTO public.amenity_bookings (amenity_id, start_time, end_time, attendee_count) VALUES ($1, $2, $3, $4)",
      [amenityId, start.toISOString(), end.toISOString(), 2],
    )

    await expect(
      client.query(
        "INSERT INTO public.amenity_bookings (amenity_id, start_time, end_time, attendee_count) VALUES ($1, $2, $3, $4)",
        [amenityId, start.toISOString(), end.toISOString(), 2],
      ),
    ).rejects.toThrow(/remaining slots/i)
  })

  test("blocks updates that would overbook the amenity", async () => {
    const amenityId = await createAmenity(3, "Wellness studio")
    const start = new Date()
    const end = hourFrom(start, 1)

    await client.query(
      "INSERT INTO public.amenity_bookings (amenity_id, start_time, end_time, attendee_count) VALUES ($1, $2, $3, $4)",
      [amenityId, start.toISOString(), end.toISOString(), 2],
    )
    const { rows } = await client.query<{ id: string }>(
      "INSERT INTO public.amenity_bookings (amenity_id, start_time, end_time, attendee_count) VALUES ($1, $2, $3, $4) RETURNING id",
      [amenityId, start.toISOString(), end.toISOString(), 1],
    )

    await expect(
      client.query("UPDATE public.amenity_bookings SET attendee_count = 2 WHERE id = $1", [rows[0].id]),
    ).rejects.toThrow(/remaining slots/i)
  })

  test("permits only one of two concurrent bookings once capacity is reached", async () => {
    const amenityId = await createAmenity(2, "Shared office")
    const start = new Date()
    const end = hourFrom(start, 1)

    const connections = [
      new Client({ host: PG_HOST, port: PG_PORT, user: PG_USER, password: PG_PASSWORD, database: TEST_DATABASE }),
      new Client({ host: PG_HOST, port: PG_PORT, user: PG_USER, password: PG_PASSWORD, database: TEST_DATABASE }),
    ]

    await Promise.all(connections.map((connection) => connection.connect()))

    const insertSql =
      "INSERT INTO public.amenity_bookings (amenity_id, start_time, end_time, attendee_count) VALUES ($1, $2, $3, $4) RETURNING id"

    const outcomes = await Promise.allSettled(
      connections.map((connection) =>
        connection.query(insertSql, [amenityId, start.toISOString(), end.toISOString(), 2]),
      ),
    )

    const successes = outcomes.filter((outcome) => outcome.status === "fulfilled")
    const failures = outcomes.filter((outcome) => outcome.status === "rejected")

    expect(successes).toHaveLength(1)
    expect(failures).toHaveLength(1)

    const failure = failures[0] as PromiseRejectedResult
    expect(failure.reason.message).toMatch(/remaining slots/i)

    await Promise.all(connections.map((connection) => connection.end()))

    const { rows } = await client.query<{ total: number | null }>(
      "SELECT COALESCE(SUM(attendee_count), 0)::int AS total FROM public.amenity_bookings WHERE amenity_id = $1",
      [amenityId],
    )

    expect(rows[0].total).toBe(2)
  })
})
