"use server"

import crypto from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12 // Recommended IV length for GCM

function ensureKeyBuffer(key: Buffer | string): Buffer {
  const buffer = Buffer.isBuffer(key) ? key : Buffer.from(key, "base64")

  if (buffer.length !== 32) {
    throw new Error("AES-256-GCM keys must be 32 bytes (256 bits)")
  }

  return buffer
}

export function encryptWithAesGcm(plaintext: string, key: Buffer | string): string {
  const keyBuffer = ensureKeyBuffer(key)
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [iv.toString("base64"), ciphertext.toString("base64"), authTag.toString("base64")].join(".")
}

export function decryptWithAesGcm(payload: string, key: Buffer | string): string {
  const segments = payload.split(".")

  if (segments.length !== 3) {
    throw new Error("Invalid AES-GCM payload format")
  }

  const [ivEncoded, ciphertextEncoded, authTagEncoded] = segments
  const keyBuffer = ensureKeyBuffer(key)
  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, Buffer.from(ivEncoded, "base64"))
  decipher.setAuthTag(Buffer.from(authTagEncoded, "base64"))

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertextEncoded, "base64")),
    decipher.final(),
  ])

  return decrypted.toString("utf8")
}
