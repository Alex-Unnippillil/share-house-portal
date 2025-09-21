import { z } from "zod"

import {
  emergencyContactSchema,
  emergencyContactsSchema,
  policyAcknowledgementSchema,
  vehicleSchema,
  vehiclesSchema,
} from "@/app/onboarding/schemas"

export const tenantMetadataSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  website: z
    .string()
    .url("Enter a valid URL")
    .optional()
    .or(z.literal("")),
  roommateRole: z.enum(["tenant", "roommate"], {
    required_error: "Select your role",
  }),
  rentShare: z
    .number({ invalid_type_error: "Enter a valid rent share" })
    .min(0, "Rent share must be positive"),
  buildingId: z.string().min(1, "Select a building"),
  unitId: z.string().min(1, "Select a unit"),
  emergencyContacts: emergencyContactsSchema.shape.emergencyContacts,
  vehicles: vehiclesSchema.shape.vehicles.default([]),
  houseRules: policyAcknowledgementSchema.shape.houseRules.or(z.boolean()),
  rentPayments: policyAcknowledgementSchema.shape.rentPayments.or(z.boolean()),
  emergencyAccess: policyAcknowledgementSchema.shape.emergencyAccess.or(z.boolean()),
})

export type TenantMetadataInput = z.infer<typeof tenantMetadataSchema>

export const tenantDocumentSchema = z.object({
  file: z.instanceof(File),
  label: z.string().min(1, "Document name is required"),
  category: z.string().min(1, "Choose a document category"),
})

export type TenantDocumentInput = z.infer<typeof tenantDocumentSchema>

export const emergencyContactListSchema = z.array(emergencyContactSchema)
export const vehicleListSchema = z.array(vehicleSchema)
