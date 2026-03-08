"use server"

import crypto from "crypto"

const WRAPPING_ALGORITHM = "aes-256-gcm" as const
const ENVELOPE_ALGORITHM = "aes-256-gcm" as const
const ENVELOPE_VERSION = 1 as const
const WRAP_IV_LENGTH = 12
const WRAP_AUTH_TAG_LENGTH = 16
const ENVELOPE_IV_LENGTH = 12

const GLOBAL_KMS_CLIENT_KEY = "__share_house_portal_kms_client__"

const DEFAULT_WRAPPING_KEY_SEED =
  process.env.KMS_WRAPPING_KEY_SEED ||
  process.env.ENCRYPTION_KEY ||
  "share-house-portal-development-wrapping-key"

export type SupportedEncoding = "utf8" | "json" | "base64"

export interface EncryptedColumnValue {
  version: typeof ENVELOPE_VERSION
  algorithm: typeof ENVELOPE_ALGORITHM
  ciphertext: string
  iv: string
  authTag: string
  keyId: string
  keyVersion: number
  keyCreatedAt: string
  encryptedDataKey: string
  kmsKeyArn: string
  tenantId: string
  context: string
  encoding: SupportedEncoding
  encryptedAt: string
}

type TenantKeyRecordInternal = {
  tenantId: string
  keyId: string
  version: number
  kmsKeyArn: string
  encryptedDataKey: string
  plaintextKey: Buffer
  createdAt: string
}

export interface TenantKeyMetadata {
  tenantId: string
  keyId: string
  version: number
  kmsKeyArn: string
  encryptedDataKey: string
  createdAt: string
}

export interface TenantKeyMaterial {
  metadata: TenantKeyMetadata
  plaintextKey: Buffer
}

export interface TenantKmsClientOptions {
  kmsKeyArn?: string
  wrappingKey?: string | Buffer
  dataKeyLength?: number
}

function deriveWrappingKey(seed: string | Buffer): Buffer {
  const normalized = typeof seed === "string" ? Buffer.from(seed) : Buffer.from(seed)
  return crypto.createHash("sha256").update(normalized).digest()
}

function deterministicWrapIv(
  tenantId: string,
  keyId: string,
  version: number
): Buffer {
  return crypto
    .createHash("sha256")
    .update(`${tenantId}:${keyId}:${version}`)
    .digest()
    .subarray(0, WRAP_IV_LENGTH)
}

export class TenantKmsClient {
  private readonly wrappingKey: Buffer
  private readonly kmsKeyArn: string
  private readonly dataKeyLength: number
  private readonly history = new Map<string, TenantKeyRecordInternal[]>()

  constructor(options: TenantKmsClientOptions = {}) {
    this.kmsKeyArn = options.kmsKeyArn ?? "arn:cloud:kms:local:0000:key/mock"
    const seed = options.wrappingKey ?? DEFAULT_WRAPPING_KEY_SEED
    this.wrappingKey = deriveWrappingKey(seed)
    this.dataKeyLength = options.dataKeyLength ?? 32
    if (this.dataKeyLength < 32) {
      throw new Error("Data key length must be at least 32 bytes for AES-256")
    }
  }

  private wrapDataKey(record: {
    tenantId: string
    keyId: string
    version: number
  }): { encryptedDataKey: string; plaintextKey: Buffer } {
    const plaintextKey = crypto.randomBytes(this.dataKeyLength)
    const iv = deterministicWrapIv(record.tenantId, record.keyId, record.version)
    const cipher = crypto.createCipheriv(WRAPPING_ALGORITHM, this.wrappingKey, iv)
    cipher.setAAD(Buffer.from(this.kmsKeyArn, "utf8"))
    const ciphertext = Buffer.concat([cipher.update(plaintextKey), cipher.final()])
    const authTag = cipher.getAuthTag()
    const encryptedPayload = Buffer.concat([iv, authTag, ciphertext]).toString("base64")
    return {
      encryptedDataKey: encryptedPayload,
      plaintextKey,
    }
  }

  private unwrapDataKey(record: {
    tenantId: string
    keyId: string
    version: number
    encryptedDataKey: string
  }): Buffer {
    const payload = Buffer.from(record.encryptedDataKey, "base64")
    if (payload.length < WRAP_IV_LENGTH + WRAP_AUTH_TAG_LENGTH) {
      throw new Error("Invalid encrypted data key payload")
    }
    const iv = payload.subarray(0, WRAP_IV_LENGTH)
    const authTag = payload.subarray(
      WRAP_IV_LENGTH,
      WRAP_IV_LENGTH + WRAP_AUTH_TAG_LENGTH
    )
    const ciphertext = payload.subarray(WRAP_IV_LENGTH + WRAP_AUTH_TAG_LENGTH)
    const decipher = crypto.createDecipheriv(WRAPPING_ALGORITHM, this.wrappingKey, iv)
    decipher.setAAD(Buffer.from(this.kmsKeyArn, "utf8"))
    decipher.setAuthTag(authTag)
    return Buffer.concat([decipher.update(ciphertext), decipher.final()])
  }

  private toMetadata(record: TenantKeyRecordInternal): TenantKeyMetadata {
    return {
      tenantId: record.tenantId,
      keyId: record.keyId,
      version: record.version,
      kmsKeyArn: record.kmsKeyArn,
      encryptedDataKey: record.encryptedDataKey,
      createdAt: record.createdAt,
    }
  }

  private createRecord(tenantId: string): TenantKeyRecordInternal {
    if (!tenantId) {
      throw new Error("tenantId is required to generate a data key")
    }

    const existing = this.history.get(tenantId) ?? []
    const lastRecord = existing[existing.length - 1]
    const version = (lastRecord?.version ?? 0) + 1
    const keyId = `${tenantId}-data-key-${crypto.randomBytes(6).toString("hex")}`
    const { encryptedDataKey, plaintextKey } = this.wrapDataKey({
      tenantId,
      keyId,
      version,
    })

    const createdAt = new Date().toISOString()
    const record: TenantKeyRecordInternal = {
      tenantId,
      keyId,
      version,
      kmsKeyArn: this.kmsKeyArn,
      encryptedDataKey,
      plaintextKey,
      createdAt,
    }

    if (existing.length) {
      existing.push(record)
    } else {
      this.history.set(tenantId, [record])
    }

    return record
  }

  async getActiveKeyMaterial(tenantId: string): Promise<TenantKeyMaterial> {
    const existing = this.history.get(tenantId)
    const record = existing?.[existing.length - 1] ?? this.createRecord(tenantId)
    return {
      metadata: this.toMetadata(record),
      plaintextKey: Buffer.from(record.plaintextKey),
    }
  }

  async rotateTenantKey(tenantId: string): Promise<TenantKeyMetadata> {
    const record = this.createRecord(tenantId)
    return this.toMetadata(record)
  }

  async decryptDataKey(metadata: {
    tenantId: string
    keyId: string
    keyVersion: number
    encryptedDataKey: string
  }): Promise<Buffer> {
    const records = this.history.get(metadata.tenantId) ?? []
    const match = records.find(
      (candidate) =>
        candidate.keyId === metadata.keyId &&
        candidate.version === metadata.keyVersion
    )

    if (match) {
      if (match.encryptedDataKey !== metadata.encryptedDataKey) {
        return this.unwrapDataKey({
          tenantId: metadata.tenantId,
          keyId: metadata.keyId,
          version: metadata.keyVersion,
          encryptedDataKey: metadata.encryptedDataKey,
        })
      }

      return Buffer.from(match.plaintextKey)
    }

    return this.unwrapDataKey({
      tenantId: metadata.tenantId,
      keyId: metadata.keyId,
      version: metadata.keyVersion,
      encryptedDataKey: metadata.encryptedDataKey,
    })
  }

  listKeyMetadata(tenantId: string): TenantKeyMetadata[] {
    return (this.history.get(tenantId) ?? []).map((record) =>
      this.toMetadata(record)
    )
  }
}

export interface EncryptValueOptions {
  tenantId: string
  context?: string
  encoding?: SupportedEncoding
  kms?: TenantKmsClient
}

export interface DecryptValueOptions {
  kms?: TenantKmsClient
  reviver?: (value: unknown) => unknown
}

export type ColumnEncryptionConfig<TRecord> = {
  [K in keyof TRecord & string]: {
    column: K
    encoding?: SupportedEncoding
    context?: string
    prepare?: (value: TRecord[K]) => unknown
    reviver?: (value: unknown) => TRecord[K]
    skipIf?: (value: TRecord[K]) => boolean
  }
}[keyof TRecord & string]

type ColumnUnion<
  TRecord,
  C extends readonly ColumnEncryptionConfig<TRecord>[]
> = C[number]["column"]

export type EncryptedRecord<
  TRecord,
  C extends readonly ColumnEncryptionConfig<TRecord>[]
> = Omit<TRecord, ColumnUnion<TRecord, C>> & {
  [K in ColumnUnion<TRecord, C> & keyof TRecord]: EncryptedColumnValue
}

function ensureTenantId(tenantId: string) {
  if (!tenantId) {
    throw new Error("tenantId is required for envelope encryption")
  }
}

function inferEncoding(value: unknown): SupportedEncoding {
  if (Buffer.isBuffer(value)) {
    return "base64"
  }

  if (typeof value === "string") {
    return "utf8"
  }

  return "json"
}

function serializeValue(value: unknown, encoding: SupportedEncoding): Buffer {
  switch (encoding) {
    case "utf8":
      if (typeof value === "string") {
        return Buffer.from(value, "utf8")
      }

      if (value === null || value === undefined) {
        return Buffer.from("", "utf8")
      }

      return Buffer.from(String(value), "utf8")
    case "json":
      return Buffer.from(JSON.stringify(value ?? null), "utf8")
    case "base64":
      if (Buffer.isBuffer(value)) {
        return Buffer.from(value)
      }

      if (typeof value === "string") {
        return Buffer.from(value, "base64")
      }

      throw new Error("Value must be a Buffer or base64 string for base64 encoding")
    default:
      throw new Error(`Unsupported encoding: ${encoding}`)
  }
}

function deserializeValue(buffer: Buffer, encoding: SupportedEncoding): unknown {
  switch (encoding) {
    case "utf8":
      return buffer.toString("utf8")
    case "json": {
      const json = buffer.toString("utf8")
      return json ? JSON.parse(json) : null
    }
    case "base64":
      return Buffer.from(buffer)
    default:
      throw new Error(`Unsupported encoding: ${encoding}`)
  }
}

export function isEncryptedColumnValue(
  value: unknown
): value is EncryptedColumnValue {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>

  if (candidate.version !== ENVELOPE_VERSION) {
    return false
  }

  if (candidate.algorithm !== ENVELOPE_ALGORITHM) {
    return false
  }

  if (typeof candidate.ciphertext !== "string") {
    return false
  }

  if (typeof candidate.iv !== "string") {
    return false
  }

  if (typeof candidate.authTag !== "string") {
    return false
  }

  if (typeof candidate.keyId !== "string") {
    return false
  }

  if (typeof candidate.encryptedDataKey !== "string") {
    return false
  }

  if (typeof candidate.kmsKeyArn !== "string") {
    return false
  }

  if (typeof candidate.tenantId !== "string") {
    return false
  }

  if (typeof candidate.context !== "string") {
    return false
  }

  if (typeof candidate.encryptedAt !== "string") {
    return false
  }

  if (typeof candidate.keyCreatedAt !== "string") {
    return false
  }

  if (typeof candidate.keyVersion !== "number") {
    return false
  }

  if (
    candidate.encoding !== "utf8" &&
    candidate.encoding !== "json" &&
    candidate.encoding !== "base64"
  ) {
    return false
  }

  return true
}

export async function encryptValue(
  value: unknown,
  options: EncryptValueOptions
): Promise<EncryptedColumnValue> {
  ensureTenantId(options.tenantId)
  const kms = options.kms ?? getTenantKmsClient()
  const encoding = options.encoding ?? inferEncoding(value)
  const payload = serializeValue(value, encoding)
  const { metadata, plaintextKey } = await kms.getActiveKeyMaterial(
    options.tenantId
  )
  const iv = crypto.randomBytes(ENVELOPE_IV_LENGTH)
  const context = options.context ?? `${options.tenantId}:default`
  const cipher = crypto.createCipheriv(ENVELOPE_ALGORITHM, plaintextKey, iv)
  cipher.setAAD(Buffer.from(context, "utf8"))
  const ciphertext = Buffer.concat([cipher.update(payload), cipher.final()])
  const authTag = cipher.getAuthTag()

  return {
    version: ENVELOPE_VERSION,
    algorithm: ENVELOPE_ALGORITHM,
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    keyId: metadata.keyId,
    keyVersion: metadata.version,
    keyCreatedAt: metadata.createdAt,
    encryptedDataKey: metadata.encryptedDataKey,
    kmsKeyArn: metadata.kmsKeyArn,
    tenantId: metadata.tenantId,
    context,
    encoding,
    encryptedAt: new Date().toISOString(),
  }
}

export async function decryptValue(
  value: EncryptedColumnValue,
  options: DecryptValueOptions = {}
): Promise<unknown> {
  if (!isEncryptedColumnValue(value)) {
    throw new Error("Attempted to decrypt a value that is not envelope encrypted")
  }

  const kms = options.kms ?? getTenantKmsClient()
  const dataKey = await kms.decryptDataKey({
    tenantId: value.tenantId,
    keyId: value.keyId,
    keyVersion: value.keyVersion,
    encryptedDataKey: value.encryptedDataKey,
  })
  const iv = Buffer.from(value.iv, "base64")
  const ciphertext = Buffer.from(value.ciphertext, "base64")
  const authTag = Buffer.from(value.authTag, "base64")
  const decipher = crypto.createDecipheriv(ENVELOPE_ALGORITHM, dataKey, iv)
  decipher.setAAD(Buffer.from(value.context, "utf8"))
  decipher.setAuthTag(authTag)
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ])
  const result = deserializeValue(decrypted, value.encoding)

  return options.reviver ? options.reviver(result) : result
}

export async function encryptSupabaseColumns<
  TRecord,
  C extends readonly ColumnEncryptionConfig<TRecord>[]
>(
  record: TRecord,
  tenantId: string,
  configs: C,
  kms: TenantKmsClient = getTenantKmsClient()
): Promise<EncryptedRecord<TRecord, C>> {
  const result: Record<string, unknown> = { ...record }

  for (const config of configs) {
    const columnName = config.column as keyof TRecord & string
    const originalValue = result[columnName] as TRecord[keyof TRecord]

    if (originalValue === null || originalValue === undefined) {
      continue
    }

    if (config.skipIf && config.skipIf(originalValue as never)) {
      continue
    }

    const prepared = config.prepare
      ? config.prepare(originalValue as never)
      : originalValue

    const encrypted = await encryptValue(prepared, {
      tenantId,
      context: config.context ?? columnName,
      encoding: config.encoding,
      kms,
    })

    result[columnName] = encrypted
  }

  return result as EncryptedRecord<TRecord, C>
}

export async function decryptSupabaseColumns<
  TRecord,
  C extends readonly ColumnEncryptionConfig<TRecord>[]
>(
  record: EncryptedRecord<TRecord, C>,
  configs: C,
  kms: TenantKmsClient = getTenantKmsClient()
): Promise<TRecord> {
  const result: Record<string, unknown> = { ...record }

  for (const config of configs) {
    const columnName = config.column as keyof TRecord & string
    const value = result[columnName]

    if (!isEncryptedColumnValue(value)) {
      continue
    }

    const decrypted = await decryptValue(value, { kms })

    result[columnName] = config.reviver
      ? config.reviver(decrypted)
      : decrypted
  }

  return result as TRecord
}

export function getTenantKmsClient(): TenantKmsClient {
  const scope = globalThis as typeof globalThis & {
    [GLOBAL_KMS_CLIENT_KEY]?: TenantKmsClient
  }

  if (!scope[GLOBAL_KMS_CLIENT_KEY]) {
    scope[GLOBAL_KMS_CLIENT_KEY] = new TenantKmsClient()
  }

  return scope[GLOBAL_KMS_CLIENT_KEY]!
}

export function setTenantKmsClient(client: TenantKmsClient | null) {
  const scope = globalThis as typeof globalThis & {
    [GLOBAL_KMS_CLIENT_KEY]?: TenantKmsClient
  }

  if (client) {
    scope[GLOBAL_KMS_CLIENT_KEY] = client
    return
  }

  delete scope[GLOBAL_KMS_CLIENT_KEY]
}
