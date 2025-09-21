"use client"

import { useMemo, useState, useTransition } from "react"
import { useForm, useFieldArray, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Download, FileText, Plus, Trash2 } from "lucide-react"
import { type User } from "@supabase/supabase-js"

import Avatar from "./avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"

import { updateAvatar, updateTenantAccount, uploadTenantDocument } from "./actions"
import type { TenantMetadataInput } from "./schemas"
import { tenantMetadataSchema } from "./schemas"

type Profile = {
  id: string
  full_name?: string | null
  username?: string | null
  website?: string | null
  avatar_url?: string | null
  role?: string | null
  building_id?: string | null
  unit_id?: string | null
}

type TenantProfile = {
  tenant_id: string
  building_id?: string | null
  unit_id?: string | null
  roommate_role?: "tenant" | "roommate" | null
  rent_share?: number | null
  onboarding_status?: string | null
}

type EmergencyContact = {
  id?: string | number
  name: string
  relationship: string
  phone: string
  email?: string | null
}

type Vehicle = {
  id?: string | number
  make: string
  model: string
  color: string
  license_plate: string
}

type PolicyAcknowledgement = {
  policy_key: string
  accepted: boolean
  acknowledged_at?: string | null
}

type TenantDocument = {
  id: string
  title: string
  category: string
  storage_path: string
  created_at?: string | null
}

type LeaseAssignment = {
  id: string
  role: string | null
  rent_share?: number | null
  lease_id: string
  leases?: {
    id: string
    name: string | null
    start_date: string | null
    end_date: string | null
    document_url: string | null
    unit_id: string | null
  } | null
}

type Building = {
  id: string
  name: string
}

type Unit = {
  id: string
  unit_number: string
  building_id: string
}

type AccountFormProps = {
  user: User
  profile: Profile | null
  tenantProfile: TenantProfile | null
  emergencyContacts: EmergencyContact[]
  vehicles: Vehicle[]
  policies: PolicyAcknowledgement[]
  documents: TenantDocument[]
  leases: LeaseAssignment[]
  buildings: Building[]
  units: Unit[]
}

type AccountFormValues = TenantMetadataInput

type DocumentUploadState = {
  file: File | null
  label: string
  category: string
}

const defaultDocumentState: DocumentUploadState = {
  file: null,
  label: "",
  category: "lease",
}

const storageBaseUrl =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/tenant-documents`
    : null

function sanitizeVehicles(vehicles: AccountFormValues["vehicles"]) {
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

function hasIncompleteVehicle(vehicles: AccountFormValues["vehicles"]) {
  return vehicles.some((vehicle) => {
    const trimmed = [vehicle.make, vehicle.model, vehicle.color, vehicle.licensePlate].map((value) =>
      (value ?? "").toString().trim()
    )
    const hasValue = trimmed.some((value) => value.length > 0)
    const hasAllValues = trimmed.every((value) => value.length > 0)
    return hasValue && !hasAllValues
  })
}

export default function AccountForm({
  user,
  profile,
  tenantProfile,
  emergencyContacts,
  vehicles,
  policies,
  documents,
  leases,
  buildings,
  units,
}: AccountFormProps) {
  const [isPending, startTransition] = useTransition()
  const [uploadPending, startUploadTransition] = useTransition()
  const [, startAvatarTransition] = useTransition()
  const [documentState, setDocumentState] = useState<DocumentUploadState>(defaultDocumentState)

  const contactDefaults = emergencyContacts.length
    ? emergencyContacts.map((contact) => ({
        name: contact.name ?? "",
        relationship: contact.relationship ?? "",
        phone: contact.phone ?? "",
        email: contact.email ?? "",
      }))
    : [{ name: "", relationship: "", phone: "", email: "" }]

  const vehicleDefaults = vehicles.map((vehicle) => ({
    make: vehicle.make ?? "",
    model: vehicle.model ?? "",
    color: vehicle.color ?? "",
    licensePlate: vehicle.license_plate ?? "",
  }))

  const policyDefaults = policies.reduce(
    (acc, policy) => {
      if (!policy.policy_key) return acc
      switch (policy.policy_key) {
        case "house_rules":
          acc.houseRules = policy.accepted ?? false
          break
        case "rent_payments":
          acc.rentPayments = policy.accepted ?? false
          break
        case "emergency_access":
          acc.emergencyAccess = policy.accepted ?? false
          break
        default:
          break
      }
      return acc
    },
    { houseRules: false, rentPayments: false, emergencyAccess: false }
  )

  const defaultValues: AccountFormValues = {
    fullName: profile?.full_name ?? "",
    username: profile?.username ?? "",
    website: profile?.website ?? "",
    roommateRole: (tenantProfile?.roommate_role ?? (profile?.role as "tenant" | "roommate") ?? "tenant") as
      | "tenant"
      | "roommate",
    rentShare: tenantProfile?.rent_share ?? 0,
    buildingId: tenantProfile?.building_id ?? profile?.building_id ?? "",
    unitId: tenantProfile?.unit_id ?? profile?.unit_id ?? "",
    emergencyContacts: contactDefaults,
    vehicles: vehicleDefaults,
    houseRules: policyDefaults.houseRules,
    rentPayments: policyDefaults.rentPayments,
    emergencyAccess: policyDefaults.emergencyAccess,
  }

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(tenantMetadataSchema),
    defaultValues,
    mode: "onBlur",
  })

  const contactsArray = useFieldArray({ control: form.control, name: "emergencyContacts" })
  const vehiclesArray = useFieldArray({ control: form.control, name: "vehicles" })

  const selectedBuildingId = form.watch("buildingId")
  const filteredUnits = useMemo(
    () => units.filter((unit) => (selectedBuildingId ? unit.building_id === selectedBuildingId : true)),
    [units, selectedBuildingId]
  )

  const handleSubmit = (values: AccountFormValues) => {
    if (hasIncompleteVehicle(values.vehicles)) {
      toast({
        title: "Complete vehicle details",
        description: "Remove vehicles with missing fields or finish filling them out.",
      })
      return
    }

    startTransition(async () => {
      const payload = {
        ...values,
        vehicles: sanitizeVehicles(values.vehicles),
      }
      const result = await updateTenantAccount(payload)
      if (!result.success) {
        toast({
          title: "Unable to update account",
          description: result.error ?? "Please try again",
        })
        return
      }
      toast({ title: "Account updated" })
    })
  }

  const handleDocumentUpload = () => {
    if (!documentState.file) {
      toast({ title: "Select a file", description: "Choose a document before uploading." })
      return
    }
    if (!documentState.label.trim()) {
      toast({ title: "Add a label", description: "Give the document a descriptive name." })
      return
    }

    const formData = new FormData()
    formData.append("file", documentState.file)
    formData.append("label", documentState.label)
    formData.append("category", documentState.category)

    startUploadTransition(async () => {
      const result = await uploadTenantDocument(formData)
      if (!result.success) {
        toast({
          title: "Upload failed",
          description: result.error ?? "Please try again",
        })
        return
      }
      setDocumentState(defaultDocumentState)
      toast({ title: "Document uploaded" })
    })
  }

  return (
    <FormProvider {...form}>
      <div className="space-y-10">
      <Card>
        <CardHeader>
          <CardTitle>Profile basics</CardTitle>
          <CardDescription>Update your contact details and unit information.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[200px_1fr]">
          <div className="flex flex-col items-center gap-4">
            <Avatar
              uid={user.id}
              url={profile?.avatar_url ?? null}
              size={128}
              onUpload={(path) => {
                startAvatarTransition(async () => {
                  const result = await updateAvatar(path)
                  if (!result.success) {
                    toast({
                      title: "Could not update avatar",
                      description: result.error ?? "Please try again",
                    })
                    return
                  }
                  toast({ title: "Avatar updated" })
                })
              }}
            />
            <p className="text-xs text-muted-foreground text-center">
              Upload a square image for best results. The avatar updates immediately after upload.
            </p>
          </div>
            <form className="space-y-6" onSubmit={form.handleSubmit(handleSubmit)}>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div>
                  <FormLabel>Email</FormLabel>
                  <Input value={user.email ?? ""} disabled />
                </div>
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input placeholder="https://" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="buildingId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Building</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value)
                          form.setValue("unitId", "")
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose building" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {buildings.map((building) => (
                            <SelectItem key={building.id} value={building.id}>
                              {building.name}
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
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose unit" />
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
                <FormField
                  control={form.control}
                  name="roommateRole"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your role" />
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
                      <FormLabel>Rent share ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step={50}
                          value={field.value ?? 0}
                          onChange={(event) => field.onChange(Number(event.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save changes"}
              </Button>
            </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Emergency contacts</CardTitle>
          <CardDescription>Provide at least one contact we can reach around the clock.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => contactsArray.append({ name: "", relationship: "", phone: "", email: "" })}
            >
              <Plus className="mr-2 h-4 w-4" /> Add contact
            </Button>
          </div>
          <div className="grid gap-4">
            {contactsArray.fields.map((fieldItem, index) => (
              <Card key={fieldItem.id}>
                <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name={`emergencyContacts.${index}.name` as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Full name" {...field} />
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
                          <Input placeholder="e.g. Sibling" {...field} />
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
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 (555) 123-4567" {...field} />
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
                  {contactsArray.fields.length > 1 && (
                    <div className="sm:col-span-2 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => contactsArray.remove(index)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Remove contact
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vehicles</CardTitle>
          <CardDescription>Register vehicles that regularly park on the property.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => vehiclesArray.append({ make: "", model: "", color: "", licensePlate: "" })}
            >
              <Plus className="mr-2 h-4 w-4" /> Add vehicle
            </Button>
          </div>
          {vehiclesArray.fields.length === 0 && (
            <p className="text-sm text-muted-foreground">No vehicles registered.</p>
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
                          <Input placeholder="Toyota" {...field} />
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
                          <Input placeholder="Prius" {...field} />
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
                          <Input placeholder="Blue" {...field} />
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Policy acknowledgements</CardTitle>
          <CardDescription>Review the agreements tied to your tenancy.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="houseRules"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Community house rules</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Quiet hours, guest expectations, and shared space etiquette.
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
                  <FormLabel>Rent payment policy</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Due dates, late fees, and how shared payments are tracked.
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
                  <FormLabel>Emergency access</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Property staff can access the unit in urgent situations.
                  </p>
                </div>
              </FormItem>
            )}
          />
          <Button type="button" onClick={form.handleSubmit(handleSubmit)} disabled={isPending}>
            {isPending ? "Saving..." : "Save policy updates"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload documents</CardTitle>
          <CardDescription>Lease agreements, identification, or other required paperwork.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <FormLabel htmlFor="document-file-input">Document file</FormLabel>
              <Input
                id="document-file-input"
                type="file"
                onChange={(event) =>
                  setDocumentState((state) => ({
                    ...state,
                    file: event.target.files?.[0] ?? null,
                  }))
                }
              />
            </div>
            <div>
              <FormLabel htmlFor="document-label-input">Label</FormLabel>
              <Input
                id="document-label-input"
                value={documentState.label}
                onChange={(event) =>
                  setDocumentState((state) => ({
                    ...state,
                    label: event.target.value,
                  }))
                }
                placeholder="e.g. Signed lease"
              />
            </div>
            <div>
              <FormLabel>Category</FormLabel>
              <Select
                value={documentState.category}
                onValueChange={(value) =>
                  setDocumentState((state) => ({
                    ...state,
                    category: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lease">Lease</SelectItem>
                  <SelectItem value="id">Identification</SelectItem>
                  <SelectItem value="vehicle">Vehicle registration</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="button" onClick={handleDocumentUpload} disabled={uploadPending}>
              {uploadPending ? "Uploading..." : "Upload document"}
            </Button>
          </div>
          {documents.length > 0 ? (
            <div className="space-y-2">
              {documents.map((document) => {
                const downloadUrl = storageBaseUrl ? `${storageBaseUrl}/${document.storage_path}` : undefined
                return (
                  <div
                    key={document.id}
                    className="flex items-center justify-between rounded-md border p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{document.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {document.category} • {document.created_at ? new Date(document.created_at).toLocaleString() : ""}
                      </p>
                    </div>
                    {downloadUrl ? (
                      <a className="inline-flex items-center text-sm font-medium" href={downloadUrl} target="_blank">
                        <Download className="mr-1 h-4 w-4" /> Download
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">Stored at {document.storage_path}</span>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lease assignments</CardTitle>
          <CardDescription>Your active and historical leases.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {leases.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leases assigned yet.</p>
          ) : (
            leases.map((assignment) => {
              const lease = assignment.leases
              return (
                <Card key={assignment.id}>
                  <CardContent className="flex flex-col gap-3 pt-6 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium">{lease?.name ?? "Lease"}</p>
                      <p className="text-sm text-muted-foreground">
                        Role: {assignment.role ?? "Tenant"} • Rent share: ${assignment.rent_share ?? tenantProfile?.rent_share ?? 0}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {lease?.start_date ? new Date(lease.start_date).toLocaleDateString() : ""} -
                        {" "}
                        {lease?.end_date ? new Date(lease.end_date).toLocaleDateString() : ""}
                      </p>
                    </div>
                    {lease?.document_url && (
                      <a className="inline-flex items-center text-sm font-medium" href={lease.document_url} target="_blank">
                        <FileText className="mr-1 h-4 w-4" /> View lease
                      </a>
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </CardContent>
      </Card>
      </div>
    </FormProvider>
  )
}
