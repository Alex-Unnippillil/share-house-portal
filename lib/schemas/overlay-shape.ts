import { z } from "zod"

export const normalizedPointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
})

export const normalizedPolygonSchema = z
  .array(normalizedPointSchema)
  .min(3, { message: "Draw at least three points" })

export const overlayShapeBaseSchema = z.object({
  label: z
    .string()
    .min(1, { message: "Label is required" })
    .max(80, { message: "Label must be 80 characters or fewer" }),
  type: z
    .string()
    .min(1, { message: "Type is required" })
    .max(40, { message: "Type must be 40 characters or fewer" }),
  polygon: normalizedPolygonSchema,
  tenantId: z
    .union([z.string().uuid({ message: "Invalid tenant" }), z.null()])
    .optional(),
})

export const overlayShapeMutationSchema = overlayShapeBaseSchema.extend({
  id: z.string().uuid().optional(),
  floorplanId: z.string().uuid(),
})

export type NormalizedPoint = z.infer<typeof normalizedPointSchema>
export type OverlayShapeMutationInput = z.infer<typeof overlayShapeMutationSchema>
