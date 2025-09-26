# Encryption Key Management

The `lib/encryption.ts` helper encrypts sensitive payloads with **AES-256-GCM** using a 12-byte initialization vector and a 32-byte key supplied by the `ENCRYPTION_KEY` environment variable. The helper performs integrity checks via the GCM authentication tag, so any tampering results in a decryption failure.

## Generating a Key

1. Generate a 32-byte key with a cryptographically secure source:
   ```bash
   openssl rand -hex 32 | cut -c1-32
   ```
2. Store the key as the `ENCRYPTION_KEY` secret in every environment (local, staging, production).
3. Redeploy the service so the new secret is available to the application.

> **Note:** The helper validates the key length at startup and throws if it is not exactly 32 bytes when UTF-8 encoded.

## Rotating the Key

Key rotation should follow an ordered, auditable process so that encrypted data remains decryptable during the transition.

1. **Prepare the new key.** Generate and store a new 32-byte key in your secret manager without removing the existing value.
2. **Decrypt existing payloads.** If you persist encrypted blobs, decrypt them with the current key before the rotation window begins.
3. **Deploy with the new key.** Update `ENCRYPTION_KEY` to the new value and redeploy every service instance. Because the helper caches the key at runtime, a deploy/restart is required for the change to take effect.
4. **Re-encrypt data.** Re-encrypt stored payloads with the new key immediately after the deploy completes.
5. **Validate and retire the old key.** Confirm that decryption succeeds with the new key in all environments, then securely remove the previous key material from secret storage and audit logs.

Following this sequence provides a deterministic cut-over and prevents partial rotations that could leave data unreadable.
