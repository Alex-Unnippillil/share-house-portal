import { z } from "zod"

export const buildingSelectionSchema = z.object({
  buildingId: z.string().min(1, "Select a building"),
  unitId: z.string().min(1, "Select a unit"),
})

export const roommateRoleSchema = z.object({
  roommateRole: z.enum(["tenant", "roommate"], {
    required_error: "Select your role",
  }),
  rentShare: z
    .number({ invalid_type_error: "Enter your rent share" })
    .min(0, "Rent share must be positive")
    .max(100000, "Rent share seems too high"),
})

export const emergencyContactSchema = z.object({
  name: z.string().min(1, "Contact name is required"),
  relationship: z.string().min(1, "Relationship is required"),
  phone: z
    .string()
    .min(7, "Enter a valid phone number")
    .regex(/^[\d+(). -]+$/, "Use numbers and common phone symbols"),
  email: z
    .string()
    .email("Enter a valid email")
    .optional()
    .or(z.literal("")),
})

export const emergencyContactsSchema = z.object({
  emergencyContacts: z
    .array(emergencyContactSchema)
    .min(1, "Add at least one emergency contact"),
})

export const vehicleSchema = z.object({
  make: z.string().min(1, "Vehicle make is required"),
  model: z.string().min(1, "Vehicle model is required"),
  color: z.string().min(1, "Vehicle color is required"),
  licensePlate: z.string().min(1, "License plate is required"),
})

export const vehiclesSchema = z.object({
  vehicles: z.array(vehicleSchema).max(4, "Up to four vehicles supported"),
})

export const policyAcknowledgementSchema = z.object({
  houseRules: z.literal(true, {
    errorMap: () => ({ message: "You must accept the house rules" }),
  }),
  rentPayments: z.literal(true, {
    errorMap: () => ({ message: "You must accept the rent policy" }),
  }),
  emergencyAccess: z.literal(true, {
    errorMap: () => ({ message: "You must confirm emergency access" }),
  }),
})

export const onboardingSchema = buildingSelectionSchema
  .merge(roommateRoleSchema)
  .merge(emergencyContactsSchema)
  .merge(vehiclesSchema)
  .merge(policyAcknowledgementSchema)

export const onboardingDraftSchema = z.object({
  buildingId: buildingSelectionSchema.shape.buildingId,
  unitId: buildingSelectionSchema.shape.unitId,
  roommateRole: roommateRoleSchema.shape.roommateRole,
  rentShare: roommateRoleSchema.shape.rentShare,
  emergencyContacts: emergencyContactsSchema.shape.emergencyContacts,
  vehicles: z
    .array(
      z.object({
        make: z.string().optional().default(""),
        model: z.string().optional().default(""),
        color: z.string().optional().default(""),
        licensePlate: z.string().optional().default(""),
      })
    )
    .default([]),
  houseRules: z.boolean(),
  rentPayments: z.boolean(),
  emergencyAccess: z.boolean(),
})

export type BuildingSelectionInput = z.infer<typeof buildingSelectionSchema>
export type RoommateRoleInput = z.infer<typeof roommateRoleSchema>
export type EmergencyContactsInput = z.infer<typeof emergencyContactsSchema>
export type VehiclesInput = z.infer<typeof vehiclesSchema>
export type PolicyAcknowledgementInput = z.infer<typeof policyAcknowledgementSchema>
export type OnboardingInput = z.infer<typeof onboardingSchema>
export type OnboardingDraftInput = z.infer<typeof onboardingDraftSchema>

export type OnboardingStep =
  | "building"
  | "role"
  | "emergency"
  | "vehicles"
  | "policy"
