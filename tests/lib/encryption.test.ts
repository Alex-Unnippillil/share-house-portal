import { beforeEach, describe, expect, it, vi } from "vitest"

const TEST_KEY = "0123456789abcdef0123456789abcdef"

describe("encryption helper", () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = TEST_KEY
    vi.resetModules()
  })

  it("encrypts and decrypts payloads with authenticated data", async () => {
    const { encrypt, decrypt } = await import("../../lib/encryption")
    const plaintext = "Sensitive roommate schedule"

    const encrypted = await encrypt(plaintext)
    const decrypted = await decrypt(encrypted)

    expect(encrypted.split(":")).toHaveLength(3)
    expect(decrypted).toBe(plaintext)
  })

  it("rejects tampered ciphertext", async () => {
    const { encrypt, decrypt } = await import("../../lib/encryption")
    const encrypted = await encrypt("Lease document reference")

    const segments = encrypted.split(":")
    const ciphertextBuffer = Buffer.from(segments[1], "base64")
    ciphertextBuffer[0] = ciphertextBuffer[0] ^ 0b00000001
    segments[1] = ciphertextBuffer.toString("base64")
    const tampered = segments.join(":")

    await expect(decrypt(tampered)).rejects.toThrow()
  })
})
