import { z } from "zod"

export const documentListFiltersSchema = z.object({
  status: z
    .array(
      z.enum(["draft", "pending_signature", "signed", "expired", "cancelled"])
    )
    .optional(),
  type: z
    .array(z.enum(["lease", "addendum", "insurance", "maintenance", "other"]))
    .optional(),
  tenant_id: z.string().uuid().optional(),
  unit_id: z.string().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
})
