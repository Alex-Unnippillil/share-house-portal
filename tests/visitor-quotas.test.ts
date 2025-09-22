import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { Client } from "pg"
import { PostgresInstance } from "pg-embedded"
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const migrationFile = join(
  process.cwd(),
  "supabase/migrations/20250712_visitor_request_quotas.sql",
)

const primaryHost = "00000000-0000-0000-0000-000000000001"
const secondaryHost = "00000000-0000-0000-0000-000000000002"
const tertiaryHost = "00000000-0000-0000-0000-000000000003"
const building = "11111111-1111-1111-1111-111111111111"
const room = "22222222-2222-2222-2222-222222222222"
const otherRoom = "33333333-3333-3333-3333-333333333333"

let postgres: PostgresInstance
let client: Client
let tempRoot: string
let dataDir: string
let installDir: string

type VisitorStatus = "approved" | "pending" | "denied" | "cancelled"

function dropPrivilegesIfRunningAsRoot() {
  if (typeof process.getuid === "function" && typeof process.setuid === "function" && process.getuid() === 0) {
    if (typeof process.setgid === "function") {
      try {
        process.setgid("nogroup")
      } catch {
        process.setgid(65534)
      }
    }

    try {
      process.setuid("nobody")
    } catch (error) {
      throw new Error(
        `Unable to drop root privileges for embedded Postgres tests: ${error instanceof Error ? error.message : error}`,
      )
    }
  }
}

async function approveStay({
  host = primaryHost,
  roomId = room,
  arrival,
  departure,
  status = "approved",
  buildingId = building,
}: {
  host?: string
  roomId?: string
  arrival: string
  departure: string
  status?: VisitorStatus
  buildingId?: string
}) {
  const result = await client.query(
    `
      INSERT INTO public.visitor_requests (
        building_id, host_profile_id, room_id, arrival_date, departure_date, status
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `,
    [buildingId, host, roomId, arrival, departure, status],
  )

  return Number(result.rows[0].id)
}

async function truncateRequests() {
  await client.query("TRUNCATE TABLE public.visitor_requests RESTART IDENTITY;")
}

describe("visitor request quotas", () => {
  beforeAll(async () => {
    dropPrivilegesIfRunningAsRoot()

    tempRoot = mkdtempSync(join(tmpdir(), "pg-embedded-"))
    dataDir = join(tempRoot, "data")
    installDir = join(tempRoot, "install")
    mkdirSync(dataDir, { recursive: true })
    mkdirSync(installDir, { recursive: true })

    postgres = new PostgresInstance({
      username: "postgres",
      password: "postgres",
      persistent: false,
      dataDir,
      installationDir: installDir,
    })

    await postgres.start()

    const info = postgres.connectionInfo
    client = new Client({
      host: info.host,
      port: info.port,
      user: info.username,
      password: info.password,
      database: info.databaseName,
    })

    await client.connect()
    const sql = readFileSync(migrationFile, "utf8")
    await client.query(sql)
  })

  afterAll(async () => {
    if (client) {
      await client.end()
    }

    if (postgres) {
      await postgres.stop().catch(() => undefined)
      await postgres.cleanup().catch(() => undefined)
    }

    if (tempRoot) {
      rmSync(tempRoot, { recursive: true, force: true })
    }
  })

  afterEach(async () => {
    await truncateRequests()
  })

  it("allows approvals that stay within member and room limits", async () => {
    await expect(
      approveStay({ arrival: "2024-06-01", departure: "2024-06-04" }),
    ).resolves.toBeTypeOf("number")

    await expect(
      approveStay({ arrival: "2024-06-10", departure: "2024-06-14" }),
    ).resolves.toBeTypeOf("number")
  })

  it("blocks approvals that exceed the monthly host limit", async () => {
    await approveStay({ arrival: "2024-06-01", departure: "2024-06-06" })

    await expect(
      approveStay({ arrival: "2024-06-06", departure: "2024-06-13" }),
    ).rejects.toThrow(/Visitor quota exceeded for host/)
  })

  it("blocks approvals when a room crosses its shared monthly cap", async () => {
    await approveStay({ arrival: "2024-06-01", departure: "2024-06-11" })
    await approveStay({ host: secondaryHost, arrival: "2024-06-11", departure: "2024-06-21" })

    await expect(
      approveStay({ host: tertiaryHost, arrival: "2024-06-21", departure: "2024-06-24" }),
    ).rejects.toThrow(/Visitor quota exceeded for room/)
  })

  it("re-evaluates limits when an approved stay is edited", async () => {
    const requestId = await approveStay({ arrival: "2024-06-01", departure: "2024-06-05" })

    await expect(approveStay({ arrival: "2024-06-15", departure: "2024-06-17", roomId: otherRoom })).resolves.toBeTypeOf(
      "number",
    )

    await expect(
      client.query(
        `
          UPDATE public.visitor_requests
          SET departure_date = $1
          WHERE id = $2
        `,
        ["2024-06-15", requestId],
      ),
    ).rejects.toThrow(/Visitor quota exceeded for host/)
  })

  it("counts overlapping stays in each affected month", async () => {
    await approveStay({ arrival: "2024-06-27", departure: "2024-07-05" })

    await expect(
      approveStay({ arrival: "2024-07-01", departure: "2024-07-08" }),
    ).rejects.toThrow(/Visitor quota exceeded for host/)
  })
})
