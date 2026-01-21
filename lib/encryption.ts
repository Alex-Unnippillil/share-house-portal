"use server"

import crypto from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12

const rawKey =
  process.env.DOCUMENT_ENCRYPTION_KEY ||
  process.env.ENCRYPTION_KEY ||
  "your-secure-encryption-key-min-32-chars"

const ENCRYPTION_KEY = crypto.createHash("sha256").update(rawKey).digest()

export type EncryptedPayload = {
  cipherText: Buffer
  iv: string
  authTag: string
  algorithm: string
}

export function encryptBuffer(buffer: Buffer): EncryptedPayload {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
  const cipherText = Buffer.concat([cipher.update(buffer), cipher.final()])
  const authTag = cipher.getAuthTag().toString("hex")

  return {
    cipherText,
    iv: iv.toString("hex"),
    authTag,
    algorithm: ALGORITHM.toUpperCase(),
  }
}

type DecryptParams = {
  cipherText: Buffer
  iv: string
  authTag: string
  algorithm?: string | null
}

export function decryptBuffer({
  cipherText,
  iv,
  authTag,
  algorithm,
}: DecryptParams): Buffer {
  const normalizedAlgorithm = (algorithm || ALGORITHM).toLowerCase()
  if (normalizedAlgorithm !== ALGORITHM) {
    throw new Error(`Unsupported encryption algorithm: ${algorithm}`)
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, Buffer.from(iv, "hex"))
  decipher.setAuthTag(Buffer.from(authTag, "hex"))

  return Buffer.concat([decipher.update(cipherText), decipher.final()])
}

export function encrypt(text: string): string {
  const { cipherText, iv, authTag } = encryptBuffer(Buffer.from(text, "utf8"))
  return `${iv}:${authTag}:${cipherText.toString("hex")}`
}

export function decrypt(payload: string): string {
  const [iv, authTag, cipherHex] = payload.split(":")
  if (!iv || !authTag || !cipherHex) {
    throw new Error("Invalid encrypted payload format")
  }

  const decrypted = decryptBuffer({
    cipherText: Buffer.from(cipherHex, "hex"),
    iv,
    authTag,
  })

  return decrypted.toString("utf8")
}
