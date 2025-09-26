import { createClient } from "@supabase/supabase-js"

import { decryptRefreshToken, encryptRefreshToken } from "@/lib/refresh-tokens"
import type { Database } from "@/lib/supabase"

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to migrate refresh tokens."
    )
  }

  const client = createClient<Database>(supabaseUrl, serviceRoleKey)

  const { data, error } = await client
    .from("user_tokens")
    .select("id,user_id,refresh_token,key_id")

  if (error) {
    throw new Error(`Failed to fetch user tokens: ${error.message}`)
  }

  if (!data?.length) {
    console.log("No refresh tokens found. Nothing to migrate.")
    return
  }

  let migrated = 0

  for (const row of data) {
    if (!row.refresh_token) {
      continue
    }

    let plaintext: string

    if (!row.key_id || row.key_id === "legacy") {
      plaintext = row.refresh_token
    } else {
      plaintext = decryptRefreshToken(row.refresh_token, row.key_id)
    }

    const { ciphertext, keyId } = encryptRefreshToken(plaintext)

    if (ciphertext === row.refresh_token && row.key_id === keyId) {
      continue
    }

    const { error: updateError } = await client
      .from("user_tokens")
      .update({ refresh_token: ciphertext, key_id: keyId })
      .eq("id", row.id)

    if (updateError) {
      throw new Error(`Failed to update token for user ${row.user_id}: ${updateError.message}`)
    }

    migrated += 1
  }

  console.log(`Migrated ${migrated} refresh token(s) to the active encryption key.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
