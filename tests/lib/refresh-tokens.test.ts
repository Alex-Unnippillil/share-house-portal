import { beforeEach, describe, expect, test, vi } from "vitest"

type MockRow = {
  id: string
  user_id: string
  refresh_token: string | null
  key_id: string | null
}

type MockState = {
  rows: MockRow[]
}

type MockQuery = {
  upsert: (payload: Partial<MockRow>) => Promise<{ error: null } | { error: Error }>
  select: () => {
    eq: (column: keyof MockRow, value: string) => {
      maybeSingle: () => Promise<{ data: MockRow | null; error: null } | { data: null; error: Error }>
    }
  }
  update: (payload: Partial<MockRow>) => {
    eq: (column: keyof MockRow, value: string) => Promise<{ error: null } | { error: Error }>
  }
}

type MockSupabaseClient = {
  from: (table: string) => MockQuery
  state: MockState
}

function createMockSupabaseClient(initialRows: MockRow[] = []): MockSupabaseClient {
  const state: MockState = { rows: [...initialRows] }

  return {
    state,
    from(table: string): MockQuery {
      if (table !== "user_tokens") {
        throw new Error(`Unexpected table: ${table}`)
      }

      return {
        async upsert(payload) {
          const existingIndex = state.rows.findIndex((row) => row.user_id === payload.user_id)

          if (existingIndex >= 0) {
            state.rows[existingIndex] = {
              ...state.rows[existingIndex],
              ...payload,
            }
          } else {
            state.rows.push({
              id: `${state.rows.length + 1}`,
              user_id: payload.user_id ?? "",
              refresh_token: payload.refresh_token ?? null,
              key_id: payload.key_id ?? null,
            })
          }

          return { error: null }
        },
        select() {
          return {
            eq(column, value) {
              return {
                async maybeSingle() {
                  const row = state.rows.find((candidate) => candidate[column] === value) || null
                  return { data: row, error: null }
                },
              }
            },
          }
        },
        update(payload) {
          return {
            async eq(column, value) {
              const row = state.rows.find((candidate) => candidate[column] === value)

              if (!row) {
                return { error: new Error("Row not found") }
              }

              Object.assign(row, payload)
              return { error: null }
            },
          }
        },
      }
    },
  }
}

const base64Key = (fill: number) => Buffer.alloc(32, fill).toString("base64")

describe("refresh token encryption", () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.REFRESH_TOKEN_ACTIVE_KEY_ID = "v1"
    process.env.REFRESH_TOKEN_KEYRING = JSON.stringify({
      v1: base64Key(1),
      v2: base64Key(2),
    })
  })

  test("encrypts and decrypts using AES-GCM", async () => {
    const { decryptRefreshToken, encryptRefreshToken } = await import("@/lib/refresh-tokens")
    const plaintext = "test-refresh-token"

    const { ciphertext, keyId } = encryptRefreshToken(plaintext)
    expect(keyId).toBe("v1")
    expect(ciphertext).not.toBe(plaintext)

    const decrypted = decryptRefreshToken(ciphertext, keyId)
    expect(decrypted).toBe(plaintext)
  })

  test("throws when decrypting with an incorrect key", async () => {
    const { decryptRefreshToken, encryptRefreshToken } = await import("@/lib/refresh-tokens")
    const { ciphertext } = encryptRefreshToken("another-token")

    expect(() => decryptRefreshToken(ciphertext, "v2")).toThrow()
  })

  test("migrates legacy rows on access", async () => {
    const { getRefreshToken, saveRefreshToken } = await import("@/lib/refresh-tokens")
    const mock = createMockSupabaseClient([
      {
        id: "legacy-id",
        user_id: "user-123",
        refresh_token: "legacy-token",
        key_id: null,
      },
    ])

    const value = await getRefreshToken(mock as unknown as any, "user-123")
    expect(value).toBe("legacy-token")

    const stored = mock.state.rows[0]
    expect(stored.refresh_token).not.toBe("legacy-token")
    expect(stored.key_id).toBe("v1")

    await saveRefreshToken(mock as unknown as any, "user-123", "new-token")
    expect(mock.state.rows[0].refresh_token).not.toBe("new-token")
  })
})
