"use server"

import type { SupabaseClient } from "@supabase/supabase-js"

import { decryptWithAesGcm, encryptWithAesGcm } from "@/lib/crypto/aes-gcm"
import type { Database } from "@/lib/supabase"

type UserTokensTable = Database["public"]["Tables"]["user_tokens"]["Row"]

type Keyring = Record<string, string>

function getActiveKeyId(): string {
  return process.env.REFRESH_TOKEN_ACTIVE_KEY_ID || "v1"
}

function loadKeyring(): Keyring {
  const raw = process.env.REFRESH_TOKEN_KEYRING

  if (!raw) {
    throw new Error(
      "REFRESH_TOKEN_KEYRING is not configured. Provide a JSON object mapping key ids to base64-encoded keys."
    )
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    throw new Error("Failed to parse REFRESH_TOKEN_KEYRING. Ensure it is valid JSON.")
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("REFRESH_TOKEN_KEYRING must be a JSON object with key id mappings.")
  }

  return parsed as Keyring
}

function getKeyMaterial(keyId: string): Buffer {
  const keyring = loadKeyring()
  const encoded = keyring[keyId]

  if (!encoded) {
    throw new Error(`No encryption key configured for key id "${keyId}".`)
  }

  const buffer = Buffer.from(encoded, "base64")

  if (buffer.length !== 32) {
    throw new Error(`Encryption key "${keyId}" must decode to 32 bytes for AES-256-GCM.`)
  }

  return buffer
}

export function encryptRefreshToken(plaintext: string): { ciphertext: string; keyId: string } {
  const keyId = getActiveKeyId()
  const key = getKeyMaterial(keyId)

  return { ciphertext: encryptWithAesGcm(plaintext, key), keyId }
}

export function decryptRefreshToken(ciphertext: string, keyId: string): string {
  const key = getKeyMaterial(keyId)
  return decryptWithAesGcm(ciphertext, key)
}

export async function saveRefreshToken(
  client: SupabaseClient<Database>,
  userId: string,
  refreshToken: string
): Promise<void> {
  const { ciphertext, keyId } = encryptRefreshToken(refreshToken)
  const { error } = await client
    .from("user_tokens")
    .upsert({ user_id: userId, refresh_token: ciphertext, key_id: keyId })

  if (error) {
    throw new Error(error.message)
  }
}

export async function getRefreshToken(
  client: SupabaseClient<Database>,
  userId: string
): Promise<string | null> {
  const { data, error } = await client
    .from("user_tokens")
    .select("refresh_token,key_id")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data || !data.refresh_token) {
    return null
  }

  const record: Pick<UserTokensTable, "refresh_token" | "key_id"> = data

  if (!record.key_id || record.key_id === "legacy") {
    const plaintext = record.refresh_token
    const { ciphertext, keyId } = encryptRefreshToken(plaintext)
    const { error: updateError } = await client
      .from("user_tokens")
      .update({ refresh_token: ciphertext, key_id: keyId })
      .eq("user_id", userId)

    if (updateError) {
      throw new Error(updateError.message)
    }

    return plaintext
  }

  return decryptRefreshToken(record.refresh_token, record.key_id)
}
