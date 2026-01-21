# Refresh Token Encryption & Rotation Guide

This guide documents how refresh tokens are encrypted, how to rotate encryption keys, and how to migrate existing data.

## Key Concepts

- **AES-256-GCM** is used for refresh-token encryption. Ciphertext is stored as a Base64 string containing the IV, ciphertext, and authentication tag separated by dots.
- **Key IDs** identify which secret was used for encryption. The active key ID is controlled by `REFRESH_TOKEN_ACTIVE_KEY_ID` and the key material lives in `REFRESH_TOKEN_KEYRING`.
- **Keyring** is a JSON object mapping key IDs to Base64 encoded 32-byte secrets. Example: `{ "v1": "base64-encoded-key" }`.

## Day-to-day Operations

1. Ensure `REFRESH_TOKEN_KEYRING` contains an entry for the active key ID.
2. Ensure `REFRESH_TOKEN_ACTIVE_KEY_ID` points to the entry you want new tokens to use.
3. Deploy application configuration whenever either variable changes. The API automatically encrypts new refresh tokens and decrypts them on access.

## Rotating Keys

Follow these steps to introduce a new encryption key:

1. **Generate a new key**

   ```bash
   openssl rand -base64 32
   ```

2. **Update the keyring**

   Append the new key to `REFRESH_TOKEN_KEYRING`. Example:

   ```json
   {
     "v1": "old-key",
     "v2": "new-base64-key"
   }
   ```

3. **Switch the active key**

   Set `REFRESH_TOKEN_ACTIVE_KEY_ID=v2` and redeploy. New refresh tokens will be written with the new key ID while existing rows continue to decrypt using their stored key identifiers.

4. **Re-encrypt existing rows**

   Run the migration script so that legacy rows are re-encrypted with the active key:

   ```bash
   pnpm dlx tsx scripts/migrate-refresh-tokens.ts
   ```

   The script requires `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and the encryption environment variables to be present. It will decrypt with the stored key IDs and re-encrypt using the active key.

5. **Clean up old keys**

   After confirming all rows report the new key ID, remove the retired key from `REFRESH_TOKEN_KEYRING`.

## Troubleshooting

- **"No encryption key configured" error**: Verify that the key ID stored with the record exists in the keyring and that the secret is a Base64 encoded 32-byte value.
- **Migration script exits early**: Ensure the Supabase credentials allow `select` and `update` on `public.user_tokens`.
- **Decrypt errors during migration**: Confirm the keyring still contains all previously used keys. Rows marked as `legacy` are treated as plaintext and will be re-encrypted automatically.
