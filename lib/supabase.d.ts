export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type GenericTableRow = Record<string, any>

type GenericTable<T extends GenericTableRow = GenericTableRow> = {
  Row: T
  Insert: Partial<T>
  Update: Partial<T>
  Relationships: unknown[]
}

type GenericView = {
  Row: GenericTableRow
  Relationships: unknown[]
}

type GenericFunction = {
  Args: Record<string, any>
  Returns: any
}

type GenericSchema = {
  Tables: Record<string, GenericTable>
  Views: Record<string, GenericView>
  Functions: Record<string, GenericFunction>
  Enums: Record<string, any>
  CompositeTypes: Record<string, any>
}

type PublicSchema = Omit<GenericSchema, "Enums"> & {
  Enums: GenericSchema["Enums"] & {
    continents:
      | "Africa"
      | "Antarctica"
      | "Asia"
      | "Europe"
      | "Oceania"
      | "North America"
      | "South America"
    user_role: "user" | "admin"
  }
}

export type Database = {
  graphql_public: GenericSchema
  next_auth: GenericSchema
  public: PublicSchema
  inquiries: GenericTable
  storage: GenericSchema
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

type DefaultSchemaTableNameOrOptions =
  | keyof DefaultSchema["Tables"]
  | { schema: keyof Database }

export type Tables<
  TableNameOrOptions extends DefaultSchemaTableNameOrOptions,
  TableName extends TableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[TableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = TableNameOrOptions extends { schema: keyof Database }
  ? Database[TableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : TableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][TableNameOrOptions] extends { Row: infer R }
      ? R
      : never
    : never

export type TablesInsert<
  TableNameOrOptions extends DefaultSchemaTableNameOrOptions,
  TableName extends TableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[TableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = TableNameOrOptions extends { schema: keyof Database }
  ? Database[TableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : TableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][TableNameOrOptions] extends { Insert: infer I }
      ? I
      : never
    : never

export type TablesUpdate<
  TableNameOrOptions extends DefaultSchemaTableNameOrOptions,
  TableName extends TableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[TableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = TableNameOrOptions extends { schema: keyof Database }
  ? Database[TableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : TableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][TableNameOrOptions] extends { Update: infer U }
      ? U
      : never
    : never

export type Enums<
  EnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof Database },
  EnumName extends EnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[EnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = EnumNameOrOptions extends { schema: keyof Database }
  ? Database[EnumNameOrOptions["schema"]]["Enums"][EnumName]
  : EnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][EnumNameOrOptions]
    : never

export type CompositeTypes<
  CompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends CompositeTypeNameOrOptions extends { schema: keyof Database }
    ? keyof Database[CompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = CompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[CompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : CompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][CompositeTypeNameOrOptions]
    : never
