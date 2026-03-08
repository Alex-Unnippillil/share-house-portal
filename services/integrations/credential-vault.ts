import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

export interface StoredCredential<T = Record<string, unknown>> {
  connectorKey: string;
  credentialId: string;
  createdAt: Date;
  updatedAt: Date;
  payload: T;
}

interface SerializedRecord {
  connectorKey: string;
  credentialId: string;
  createdAt: string;
  updatedAt: string;
  encryptedPayload: string;
  initializationVector: string;
  authenticationTag: string;
}

const ALGORITHM = 'aes-256-gcm';

const buildStorageKey = (connectorKey: string, credentialId: string): string => `${connectorKey}::${credentialId}`;

const deriveEncryptionKey = (secret?: string): Buffer => {
  const fallbackSecret = secret ?? process.env.INTEGRATIONS_VAULT_SECRET ?? 'development-only-secret';
  return createHash('sha256').update(fallbackSecret).digest();
};

export class CredentialVault {
  private readonly encryptionKey: Buffer;

  private readonly storage = new Map<string, SerializedRecord>();

  constructor(secret?: string) {
    this.encryptionKey = deriveEncryptionKey(secret);
  }

  listCredentials(connectorKey: string): StoredCredential[] {
    const results: StoredCredential[] = [];

    for (const record of this.storage.values()) {
      if (record.connectorKey !== connectorKey) {
        continue;
      }

      results.push({
        connectorKey: record.connectorKey,
        credentialId: record.credentialId,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
        payload: this.decryptPayload(record.encryptedPayload, record.initializationVector, record.authenticationTag),
      });
    }

    return results;
  }

  async setCredentials<T extends Record<string, unknown>>(
    connectorKey: string,
    credentialId: string,
    payload: T,
  ): Promise<StoredCredential<T>> {
    const now = new Date();
    const encrypted = this.encryptPayload(payload);
    const record: SerializedRecord = {
      connectorKey,
      credentialId,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      encryptedPayload: encrypted.value,
      initializationVector: encrypted.initializationVector,
      authenticationTag: encrypted.authenticationTag,
    };

    this.storage.set(buildStorageKey(connectorKey, credentialId), record);

    return {
      connectorKey,
      credentialId,
      createdAt: now,
      updatedAt: now,
      payload,
    };
  }

  async updateCredentials<T extends Record<string, unknown>>(
    connectorKey: string,
    credentialId: string,
    payload: T,
  ): Promise<StoredCredential<T>> {
    const storageKey = buildStorageKey(connectorKey, credentialId);
    const existing = this.storage.get(storageKey);

    if (!existing) {
      throw new Error(`Credential ${credentialId} has not been stored for connector ${connectorKey}`);
    }

    const now = new Date();
    const encrypted = this.encryptPayload(payload);

    const record: SerializedRecord = {
      connectorKey,
      credentialId,
      createdAt: existing.createdAt,
      updatedAt: now.toISOString(),
      encryptedPayload: encrypted.value,
      initializationVector: encrypted.initializationVector,
      authenticationTag: encrypted.authenticationTag,
    };

    this.storage.set(storageKey, record);

    return {
      connectorKey,
      credentialId,
      createdAt: new Date(existing.createdAt),
      updatedAt: now,
      payload,
    };
  }

  async deleteCredentials(connectorKey: string, credentialId: string): Promise<boolean> {
    return this.storage.delete(buildStorageKey(connectorKey, credentialId));
  }

  async getCredentials<T extends Record<string, unknown>>(
    connectorKey: string,
    credentialId: string,
  ): Promise<StoredCredential<T>> {
    const record = this.storage.get(buildStorageKey(connectorKey, credentialId));

    if (!record) {
      throw new Error(`Missing credentials for connector ${connectorKey} and id ${credentialId}`);
    }

    return {
      connectorKey,
      credentialId,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
      payload: this.decryptPayload<T>(record.encryptedPayload, record.initializationVector, record.authenticationTag),
    };
  }

  hasCredentials(connectorKey: string, credentialId: string): boolean {
    return this.storage.has(buildStorageKey(connectorKey, credentialId));
  }

  private encryptPayload<T extends Record<string, unknown>>(
    payload: T,
  ): { value: string; initializationVector: string; authenticationTag: string } {
    const initializationVector = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, this.encryptionKey, initializationVector);
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);

    return {
      value: encrypted.toString('base64'),
      initializationVector: initializationVector.toString('base64'),
      authenticationTag: cipher.getAuthTag().toString('base64'),
    };
  }

  private decryptPayload<T>(value: string, initializationVector: string, authenticationTag: string): T {
    const decipher = createDecipheriv(ALGORITHM, this.encryptionKey, Buffer.from(initializationVector, 'base64'));
    decipher.setAuthTag(Buffer.from(authenticationTag, 'base64'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(value, 'base64')),
      decipher.final(),
    ]);

    return JSON.parse(decrypted.toString('utf8')) as T;
  }
}
