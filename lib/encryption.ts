"use server"

import crypto from "crypto"

const KEY_LENGTH = 32
const IV_LENGTH = 12
const ALGORITHM = "aes-256-gcm"

let cachedKey: Buffer | null = null

function getEncryptionKey(): Buffer {
  if (cachedKey) {
    return cachedKey
  }

  const keySource = process.env.ENCRYPTION_KEY

  if (typeof keySource !== "string") {
    throw new Error("ENCRYPTION_KEY must be set and contain exactly 32 bytes.")
  }

  const keyBuffer = Buffer.from(keySource, "utf-8")

  if (keyBuffer.length !== KEY_LENGTH) {
    throw new Error(`ENCRYPTION_KEY must be exactly ${KEY_LENGTH} bytes.`)
  }

  cachedKey = keyBuffer
  return cachedKey
}

export async function encrypt(plaintext: string): Promise<string> {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [iv.toString("base64"), encrypted.toString("base64"), authTag.toString("base64")].join(":")
}

export async function decrypt(payload: string): Promise<string> {
  const segments = payload.split(":")

  if (segments.length !== 3) {
    throw new Error("Invalid encrypted payload format.")
  }

  const [ivSegment, encryptedSegment, authTagSegment] = segments
  const iv = Buffer.from(ivSegment, "base64")

  if (iv.length !== IV_LENGTH) {
    throw new Error("Invalid initialization vector length.")
  }

  const encryptedText = Buffer.from(encryptedSegment, "base64")
  const authTag = Buffer.from(authTagSegment, "base64")
  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()])
  return decrypted.toString("utf8")
}


