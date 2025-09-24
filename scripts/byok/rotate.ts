import {
  decryptValue,
  encryptValue,
  EncryptedColumnValue,
  getTenantKmsClient,
  isEncryptedColumnValue,
  TenantKmsClient,
} from "../../lib/encryption"

export interface RotationTableConfig {
  table: string
  primaryKey: string
  tenantIdColumn: string
  columns: string[]
}

export interface SupabaseRotationAdapter {
  fetchBatch: (
    table: string,
    columns: string[],
    options: { offset: number; limit: number }
  ) => Promise<Array<Record<string, unknown>>>
  update: (
    table: string,
    primaryKey: string,
    rowId: string,
    updates: Record<string, unknown>
  ) => Promise<void>
}

export interface RotateTenantKeysOptions {
  supabase: SupabaseRotationAdapter
  tables: RotationTableConfig[]
  kms?: TenantKmsClient
  batchSize?: number
  logger?: Pick<typeof console, "info" | "warn" | "error">
}

export interface RotationSummary {
  rotatedTenants: number
  processedRows: number
  reencryptedColumns: number
  skippedRows: number
  perTenant: Record<string, { rows: number; columns: number }>
}

function uniqueColumns(columns: string[]): string[] {
  return Array.from(new Set(columns))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object"
}

function ensureRowIdentifier(
  row: Record<string, unknown>,
  primaryKey: string
): string {
  const identifier = row[primaryKey]
  if (typeof identifier !== "string") {
    throw new Error(
      `Rotation requires primary key "${primaryKey}" to be a string, received ${String(
        identifier
      )}`
    )
  }

  return identifier
}

function resolveTenantId(
  row: Record<string, unknown>,
  tenantIdColumn: string
): string | null {
  const tenantId = row[tenantIdColumn]
  if (tenantId === null || tenantId === undefined) {
    return null
  }

  return typeof tenantId === "string" ? tenantId : String(tenantId)
}

async function reencryptColumn(
  column: string,
  value: unknown,
  tenantId: string,
  kms: TenantKmsClient,
  table: string
): Promise<EncryptedColumnValue | null> {
  if (!isEncryptedColumnValue(value)) {
    return null
  }

  const decrypted = await decryptValue(value, { kms })
  const context = value.context ?? `${table}.${column}`
  const encrypted = await encryptValue(decrypted, {
    tenantId,
    context,
    encoding: value.encoding,
    kms,
  })

  return encrypted
}

export async function rotateTenantKeysAndBackfill({
  supabase,
  tables,
  kms = getTenantKmsClient(),
  batchSize = 200,
  logger = console,
}: RotateTenantKeysOptions): Promise<RotationSummary> {
  const rotatedTenants = new Set<string>()
  const summary: RotationSummary = {
    rotatedTenants: 0,
    processedRows: 0,
    reencryptedColumns: 0,
    skippedRows: 0,
    perTenant: {},
  }

  for (const table of tables) {
    let offset = 0

    const columnsToFetch = uniqueColumns([
      table.primaryKey,
      table.tenantIdColumn,
      ...table.columns,
    ])

    while (true) {
      const rows = await supabase.fetchBatch(table.table, columnsToFetch, {
        offset,
        limit: batchSize,
      })

      if (!rows.length) {
        break
      }

      for (const row of rows) {
        if (!isRecord(row)) {
          summary.skippedRows += 1
          continue
        }

        let tenantId: string | null
        try {
          tenantId = resolveTenantId(row, table.tenantIdColumn)
        } catch (error) {
          summary.skippedRows += 1
          logger.warn?.(
            `Skipping row due to tenant resolution error in ${table.table}:`,
            error
          )
          continue
        }

        if (!tenantId) {
          summary.skippedRows += 1
          continue
        }

        if (!rotatedTenants.has(tenantId)) {
          await kms.rotateTenantKey(tenantId)
          rotatedTenants.add(tenantId)
        }

        const updates: Record<string, unknown> = {}
        let columnsUpdated = 0

        for (const column of table.columns) {
          try {
            const encrypted = await reencryptColumn(
              column,
              row[column],
              tenantId,
              kms,
              table.table
            )

            if (encrypted) {
              updates[column] = encrypted
              columnsUpdated += 1
            }
          } catch (error) {
            logger.warn?.(
              `Failed to rotate column ${table.table}.${column} for tenant ${tenantId}:`,
              error
            )
          }
        }

        if (!columnsUpdated) {
          summary.skippedRows += 1
          continue
        }

        summary.processedRows += 1
        summary.reencryptedColumns += columnsUpdated

        if (!summary.perTenant[tenantId]) {
          summary.perTenant[tenantId] = { rows: 0, columns: 0 }
        }

        summary.perTenant[tenantId].rows += 1
        summary.perTenant[tenantId].columns += columnsUpdated

        const rowId = ensureRowIdentifier(row, table.primaryKey)
        await supabase.update(table.table, table.primaryKey, rowId, updates)
      }

      offset += rows.length

      if (rows.length < batchSize) {
        break
      }
    }
  }

  summary.rotatedTenants = rotatedTenants.size

  if (summary.rotatedTenants === 0) {
    logger.warn?.("No tenant data keys were rotated during BYOK backfill")
  } else {
    logger.info?.(
      `Rotated ${summary.rotatedTenants} tenant data keys and re-encrypted ${summary.reencryptedColumns} column values`
    )
  }

  return summary
}

export default rotateTenantKeysAndBackfill
