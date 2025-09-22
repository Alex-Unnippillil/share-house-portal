export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type DatabaseSchemaShape = {
  Tables: Record<string, unknown>
  Views: Record<string, unknown>
  Functions: Record<string, unknown>
  Enums: Record<string, unknown>
  CompositeTypes: Record<string, unknown>
}

export type Database = {
  graphql_public: DatabaseSchemaShape
  next_auth: DatabaseSchemaShape
  public: DatabaseSchemaShape
  storage: DatabaseSchemaShape
}

export type Tables<
  SchemaName extends keyof Database = "public",
  TableName extends string = string,
> = any

export type TablesInsert<
  SchemaName extends keyof Database = "public",
  TableName extends string = string,
> = any

export type TablesUpdate<
  SchemaName extends keyof Database = "public",
  TableName extends string = string,
> = any

export type Enums<
  SchemaName extends keyof Database = "public",
  EnumName extends string = string,
> = any

export type CompositeTypes<
  SchemaName extends keyof Database = "public",
  CompositeTypeName extends string = string,
> = any

export const Constants = {
  graphql_public: { Enums: {} },
  next_auth: { Enums: {} },
  public: {
    Enums: {
      continents: [
        "Africa",
        "Antarctica",
        "Asia",
        "Europe",
        "Oceania",
        "North America",
        "South America",
      ],
      user_role: ["user", "admin"],
    },
  },
  storage: { Enums: {} },
} as const
