"use client"

import { useMemo, useState, useTransition } from "react"
import { useForm, useFieldArray, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle2, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"

import {
  onboardingDraftSchema,
  type OnboardingDraftInput,
  type OnboardingStep,
} from "./schemas"
import { completeOnboarding, saveOnboardingStep } from "./actions"

export type BuildingOption = {
  id: string
  name: string
  address_line1?: string | null
  city?: string | null
  state?: string | null
}

export type UnitOption = {
  id: string
  building_id: string
  unit_number: string
  bedrooms?: number | null
  bathrooms?: number | null
}

export type EmergencyContact = {
  name: string
  relationship: string
  phone: string
  email?: string | null
}

export type Vehicle = {
  make: string
  model: string
  color: string
  licensePlate: string
}

export type PolicyAcknowledgements = {
  houseRules?: boolean
  rentPayments?: boolean
  emergencyAccess?: boolean
}

export type OnboardingInitialValues = {
  buildingId?: string | null
  unitId?: string | null
  roommateRole?: "tenant" | "roommate" | null
  rentShare?: number | null
  emergencyContacts?: EmergencyContact[]
  vehicles?: Vehicle[]
  acknowledgements?: PolicyAcknowledgements
  onboardingStatus?: string | null
}

export type OnboardingFormValues = OnboardingDraftInput

const stepOrder: Array<{ id: OnboardingStep | "review"; title: string; description: string }> = [
  {
    id: "building",
    title: "Where do you live?",
    description: "Choose your building and unit to connect with the correct household.",
  },
  {
    id: "role",
    title: "Roommate details",
    description: "Tell us how you split rent and what role you play in the home.",
  },
  {
    id: "emergency",
    title: "Emergency contacts",
    description: "Who should we call if there's an emergency?",
  },
  {
    id: "vehicles",
    title: "Vehicle info",
    description: "Register vehicles parked on the property (optional).",
  },
  {
    id: "policy",
    title: "Policies",
    description: "Acknowledge the core community policies for your building.",
  },
  {
    id: "review",
    title: "Review & submit",
    description: "Confirm your details to finish onboarding.",
  },
]

const fieldsByStep: Record<OnboardingStep, Array<keyof OnboardingFormValues>> = {
  building: ["buildingId", "unitId"],
  role: ["roommateRole", "rentShare"],
  emergency: ["emergencyContacts"],
  vehicles: ["vehicles"],
  policy: ["houseRules", "rentPayments", "emergencyAccess"],
}

function sanitizeVehicles(vehicles: Vehicle[]) {
  return vehicles
    .filter((vehicle) =>
      [vehicle.make, vehicle.model, vehicle.color, vehicle.licensePlate].some((value) =>
        (value ?? "").toString().trim()
      )
    )
    .map((vehicle) => ({
      make: (vehicle.make ?? "").toString().trim(),
      model: (vehicle.model ?? "").toString().trim(),
      color: (vehicle.color ?? "").toString().trim(),
      licensePlate: (vehicle.licensePlate ?? "").toString().trim(),
    }))
}

function hasIncompleteVehicle(vehicles: Vehicle[]) {
  return vehicles.some((vehicle) => {
    const filled = [vehicle.make, vehicle.model, vehicle.color, vehicle.licensePlate].map((value) =>
      (value ?? "").toString().trim()
    )
    const hasValue = filled.some((value) => value.length > 0)
    const hasAllValues = filled.every((value) => value.length > 0)
    return hasValue && !hasAllValues
  })
}

export function OnboardingForm({
  buildings,
  units,
  initialValues,
}: {
  buildings: BuildingOption[]
  units: UnitOption[]
  initialValues: OnboardingInitialValues
}) {
  const [stepIndex, setStepIndex] = useState(0)
  const [pending, startTransition] = useTransition()

  const defaultValues: OnboardingFormValues = useMemo(() => {
    const contacts = initialValues.emergencyContacts?.length
      ? initialValues.emergencyContacts.map((contact) => ({
          name: contact.name ?? "",
          relationship: contact.relationship ?? "",
          phone: contact.phone ?? "",
          email: contact.email ?? "",
        }))
      : [
          { name: "", relationship: "", phone: "", email: "" },
        ]

    const vehicles = initialValues.vehicles?.map((vehicle) => ({
      make: vehicle.make ?? "",
      model: vehicle.model ?? "",
      color: vehicle.color ?? "",
      licensePlate: vehicle.licensePlate ?? "",
    })) ?? []

    return {
      buildingId: initialValues.buildingId ?? "",
      unitId: initialValues.unitId ?? "",
      roommateRole: initialValues.roommateRole ?? "tenant",
      rentShare: initialValues.rentShare ?? 0,
      emergencyContacts: contacts,
      vehicles,
      houseRules: initialValues.acknowledgements?.houseRules ?? false,
      rentPayments: initialValues.acknowledgements?.rentPayments ?? false,
      emergencyAccess: initialValues.acknowledgements?.emergencyAccess ?? false,
    }
  }, [initialValues])

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingDraftSchema),
    defaultValues,
    mode: "onBlur",
  })

  const emergencyContactsArray = useFieldArray({ name: "emergencyContacts", control: form.control })
  const vehiclesArray = useFieldArray({ name: "vehicles", control: form.control })

  const currentStep = stepOrder[stepIndex]
  const progress = Math.round((stepIndex / (stepOrder.length - 1)) * 100)
  const selectedBuildingId = form.watch("buildingId")

  const filteredUnits = useMemo(
    () =>
      units.filter((unit) =>
        selectedBuildingId ? unit.building_id === selectedBuildingId : true
      ),
    [units, selectedBuildingId]
  )

  const handleServerStep = async (step: OnboardingStep) => {
    const values = form.getValues()
    if (step === "vehicles") {
      if (hasIncompleteVehicle(values.vehicles)) {
        toast({
          title: "Complete vehicle details",
          description: "Fill all vehicle fields or remove incomplete entries before continuing.",
        })
        return false
      }
      const sanitized = sanitizeVehicles(values.vehicles)
      form.setValue("vehicles", sanitized)
    }

    const payload: Record<string, unknown> = (() => {
      switch (step) {
        case "building":
          return { buildingId: values.buildingId, unitId: values.unitId }
        case "role":
          return { roommateRole: values.roommateRole, rentShare: values.rentShare }
        case "emergency":
          return { emergencyContacts: values.emergencyContacts }
        case "vehicles":
          return { vehicles: sanitizeVehicles(values.vehicles) }
        case "policy":
          return {
            houseRules: values.houseRules,
            rentPayments: values.rentPayments,
            emergencyAccess: values.emergencyAccess,
          }
      }
    })()

    const result = await saveOnboardingStep(step, payload)
    if (!result.success) {
      toast({
        title: "Could not save step",
        description: result.error ?? "Please try again",
      })
      return false
    }
    return true
  }

  const handleNext = async () => {
    if (currentStep.id === "review") {
      return
    }

    const fields = fieldsByStep[currentStep.id]
    const valid = await form.trigger(fields as any)
    if (!valid) {
      toast({
        title: "Update highlighted fields",
        description: "We need a little more information before moving on.",
      })
      return
    }

    startTransition(async () => {
      const saved = await handleServerStep(currentStep.id as OnboardingStep)
      if (!saved) return
      setStepIndex((prev) => Math.min(prev + 1, stepOrder.length - 1))
    })
  }

  const handleBack = () => {
    setStepIndex((prev) => Math.max(prev - 1, 0))
  }

  const handleSaveProgress = async () => {
    if (currentStep.id === "review") return
    const fields = fieldsByStep[currentStep.id as OnboardingStep]
    const valid = await form.trigger(fields as any)
    if (!valid) {
      toast({
        title: "Cannot save yet",
        description: "Please resolve validation errors before saving progress.",
      })
      return
    }
    startTransition(async () => {
      const saved = await handleServerStep(currentStep.id as OnboardingStep)
      if (saved) {
        toast({ title: "Progress saved" })
      }
    })
  }

  const onSubmit = async (values: OnboardingFormValues) => {
    if (hasIncompleteVehicle(values.vehicles)) {
      toast({
        title: "Complete vehicle details",
        description: "Remove vehicles with missing information or finish filling them out.",
      })
      return
    }

    startTransition(async () => {
      const payload = {
        ...values,
        vehicles: sanitizeVehicles(values.vehicles),
      }
      const result = await completeOnboarding(payload)
      if (!result.success) {
        toast({
          title: "Could not finish onboarding",
          description: result.error ?? "Please try again",
        })
        return
      }
      toast({
        title: "Welcome home!",
        description: "Your onboarding is complete. You can review details in Account settings.",
      })
    })
  }

  return (
    <FormProvider {...form}>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 py-10">
      {initialValues.onboardingStatus === "completed" && (
        <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4" />
            <p>
              You have already completed onboarding. Updating the form below lets you refresh your
              household details.
            </p>
          </div>
        </div>
      )}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Tenant onboarding</CardTitle>
              <CardDescription>
                Complete the guided steps so property managers and roommates can coordinate with you.
              </CardDescription>
            </div>
            <div className="w-32">
              <Progress value={progress} aria-label="Onboarding progress" />
              <p className="mt-1 text-xs text-muted-foreground">
                Step {stepIndex + 1} of {stepOrder.length}
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {stepOrder.map((step, index) => (
              <div
                key={step.id}
                className={`rounded-md border p-3 text-sm ${
                  index === stepIndex
                    ? "border-primary bg-primary/5"
                    : index < stepIndex
                      ? "border-green-300 bg-green-50 text-green-800"
                      : "border-muted bg-muted"
                }`}
              >
                <p className="font-medium">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </CardHeader>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-6">
                {currentStep.id === "building" && (
                  <div className="grid gap-6 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="buildingId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Building</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              form.setValue("unitId", "")
                              field.onChange(value)
                            }}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select your building" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {buildings.map((building) => (
                                <SelectItem key={building.id} value={building.id}>
                                  {building.name}
                                  {building.city ? ` • ${building.city}, ${building.state ?? ""}` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="unitId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select your unit" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {filteredUnits.map((unit) => (
                                <SelectItem key={unit.id} value={unit.id}>
                                  Unit {unit.unit_number}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {currentStep.id === "role" && (
                  <div className="grid gap-6 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="roommateRole"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your role</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="tenant">Primary tenant</SelectItem>
                              <SelectItem value="roommate">Roommate / subtenant</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="rentShare"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly rent share ($)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              step={50}
                              value={field.value ?? 0}
                              onChange={(event) => field.onChange(Number(event.target.value))}
                              placeholder="e.g. 875"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {currentStep.id === "emergency" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-semibold">Emergency contacts</h3>
                        <p className="text-sm text-muted-foreground">
                          Provide at least one contact we can reach 24/7.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          emergencyContactsArray.append({
                            name: "",
                            relationship: "",
                            phone: "",
                            email: "",
                          })
                        }
                      >
                        <Plus className="mr-2 h-4 w-4" /> Add contact
                      </Button>
                    </div>
                    <div className="grid gap-4">
                      {emergencyContactsArray.fields.map((fieldItem, index) => (
                        <Card key={fieldItem.id}>
                          <CardContent className="grid gap-4 pt-6">
                            <div className="grid gap-4 sm:grid-cols-2">
                              <FormField
                                control={form.control}
                                name={`emergencyContacts.${index}.name` as const}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Full name</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Contact name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`emergencyContacts.${index}.relationship` as const}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Relationship</FormLabel>
                                    <FormControl>
                                      <Input placeholder="e.g. Parent" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`emergencyContacts.${index}.phone` as const}
                                render={({ field }) => (
                                  <FormItem className="sm:col-span-2">
                                    <FormLabel>Phone number</FormLabel>
                                    <FormControl>
                                      <Input placeholder="e.g. +1 (555) 123-4567" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`emergencyContacts.${index}.email` as const}
                                render={({ field }) => (
                                  <FormItem className="sm:col-span-2">
                                    <FormLabel>Email (optional)</FormLabel>
                                    <FormControl>
                                      <Input placeholder="contact@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            {emergencyContactsArray.fields.length > 1 && (
                              <div className="flex justify-end">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="text-destructive"
                                  onClick={() => emergencyContactsArray.remove(index)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Remove contact
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {currentStep.id === "vehicles" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-semibold">Vehicles</h3>
                        <p className="text-sm text-muted-foreground">
                          Register up to four vehicles that regularly park on-site.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          vehiclesArray.append({
                            make: "",
                            model: "",
                            color: "",
                            licensePlate: "",
                          })
                        }
                      >
                        <Plus className="mr-2 h-4 w-4" /> Add vehicle
                      </Button>
                    </div>
                    {vehiclesArray.fields.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No vehicles added yet. You can skip this step if you don't have one.
                      </p>
                    )}
                    <div className="grid gap-4">
                      {vehiclesArray.fields.map((fieldItem, index) => (
                        <Card key={fieldItem.id}>
                          <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
                            <FormField
                              control={form.control}
                              name={`vehicles.${index}.make` as const}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Make</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g. Toyota" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`vehicles.${index}.model` as const}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Model</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g. Prius" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`vehicles.${index}.color` as const}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Color</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g. Blue" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`vehicles.${index}.licensePlate` as const}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>License plate</FormLabel>
                                  <FormControl>
                                    <Input placeholder="ABC-1234" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="sm:col-span-2 flex justify-end">
                              <Button
                                type="button"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => vehiclesArray.remove(index)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Remove vehicle
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {currentStep.id === "policy" && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Acknowledge each policy to continue. These can also be reviewed in your account
                      settings.
                    </p>
                    <FormField
                      control={form.control}
                      name="houseRules"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-medium">Community house rules</FormLabel>
                            <p className="text-sm text-muted-foreground">
                              I agree to follow quiet hours, shared space etiquette, and visitor guidelines.
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="rentPayments"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-medium">Rent payment policy</FormLabel>
                            <p className="text-sm text-muted-foreground">
                              I understand when rent is due, late fee timelines, and shared payment expectations.
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="emergencyAccess"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-medium">Emergency access</FormLabel>
                            <p className="text-sm text-muted-foreground">
                              I grant property staff emergency access in urgent situations after reasonable notice.
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {currentStep.id === "review" && (
                  <div className="space-y-4 text-sm">
                    <p className="text-muted-foreground">
                      Double-check your details before finishing onboarding. You can make changes later in
                      account settings.
                    </p>
                    <div className="rounded-md border bg-muted p-4">
                      <h3 className="font-medium">Unit assignment</h3>
                      <p className="text-sm text-muted-foreground">
                        Building: {buildings.find((b) => b.id === form.watch("buildingId"))?.name ?? "—"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Unit: {filteredUnits.find((u) => u.id === form.watch("unitId"))?.unit_number ?? "—"}
                      </p>
                    </div>
                    <div className="rounded-md border bg-muted p-4">
                      <h3 className="font-medium">Roommate role</h3>
                      <p className="text-sm text-muted-foreground">
                        Role: {form.watch("roommateRole") === "tenant" ? "Primary tenant" : "Roommate"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Rent share: ${form.watch("rentShare")?.toFixed(2) ?? "0.00"}
                      </p>
                    </div>
                    <div className="rounded-md border bg-muted p-4">
                      <h3 className="font-medium">Emergency contacts</h3>
                      <ul className="space-y-2">
                        {form.watch("emergencyContacts").map((contact, index) => (
                          <li key={index}>
                            <p className="font-medium">{contact.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {contact.relationship} • {contact.phone}
                              {contact.email ? ` • ${contact.email}` : ""}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {form.watch("vehicles").length > 0 && (
                      <div className="rounded-md border bg-muted p-4">
                        <h3 className="font-medium">Vehicles</h3>
                        <ul className="space-y-2">
                          {form.watch("vehicles").map((vehicle, index) => (
                            <li key={index}>
                              <p className="font-medium">
                                {vehicle.color} {vehicle.make} {vehicle.model}
                              </p>
                              <p className="text-sm text-muted-foreground">Plate: {vehicle.licensePlate}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="rounded-md border bg-muted p-4">
                      <h3 className="font-medium">Policy acknowledgements</h3>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li>Community house rules: {form.watch("houseRules") ? "Accepted" : "Pending"}</li>
                        <li>Rent payment policy: {form.watch("rentPayments") ? "Accepted" : "Pending"}</li>
                        <li>Emergency access: {form.watch("emergencyAccess") ? "Accepted" : "Pending"}</li>
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col gap-2 border-t bg-muted/40 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={handleBack} disabled={stepIndex === 0 || pending}>
                    Back
                  </Button>
                  {currentStep.id !== "review" && (
                    <Button type="button" variant="secondary" onClick={handleSaveProgress} disabled={pending}>
                      Save progress
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  {currentStep.id !== "review" ? (
                    <Button type="button" onClick={handleNext} disabled={pending}>
                      Next step
                    </Button>
                  ) : (
                    <Button type="submit" disabled={pending}>
                      Finish onboarding
                    </Button>
                  )}
                </div>
              </CardFooter>
            </form>
      </Card>
      </div>
    </FormProvider>
  )
}
