// Simplified Supabase types used for runtime compatibility and to avoid build-time parser issues.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type TableDefinition = {
  Row: Record<string, unknown>
  Insert: Record<string, unknown>
  Update: Record<string, unknown>
}

type SchemaDefinition = {
  Tables: Record<string, TableDefinition>
  Views: Record<string, unknown>
  Functions: Record<string, { Args: Record<string, unknown>; Returns: unknown }>
  Enums: Record<string, string | number>
  CompositeTypes: Record<string, unknown>
}

export type Database = {
  [schema: string]: SchemaDefinition
}

export type Tables<S extends keyof Database = keyof Database, T extends keyof Database[S]["Tables"] = keyof Database[S]["Tables"]> =
  Database[S]["Tables"][T]["Row"]

export type TablesInsert<S extends keyof Database = keyof Database, T extends keyof Database[S]["Tables"] = keyof Database[S]["Tables"]> =
  Database[S]["Tables"][T]["Insert"]

export type TablesUpdate<S extends keyof Database = keyof Database, T extends keyof Database[S]["Tables"] = keyof Database[S]["Tables"]> =
  Database[S]["Tables"][T]["Update"]

export type Enums<S extends keyof Database = keyof Database, T extends keyof Database[S]["Enums"] = keyof Database[S]["Enums"]> =
  Database[S]["Enums"][T]
