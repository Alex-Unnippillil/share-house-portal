"use client"

import Image from "next/image"
import { useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from "react"
import { useFormState, useFormStatus } from "react-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import {
  createAnnotation,
  createFloorplan,
  deleteAnnotation,
  deleteFloorplan,
  initialActionState,
  updateAnnotation,
  type ActionState,
} from "../actions"
import type { AnnotationClientModel, BuildingOption, FloorplanClientModel } from "../types"

const annotationTypes = [
  { value: "storage", label: "Storage" },
  { value: "chore", label: "Chore" },
  { value: "note", label: "Note" },
  { value: "other", label: "Other" },
] as const

type ManagerSectionProps = {
  floorplans: FloorplanClientModel[]
  buildingOptions: BuildingOption[]
}

const formatMessage = (state: ActionState) => {
  if (state.status === "error" || state.status === "success") {
    return state.message
  }

  return undefined
}

export default function ManagerSection({ floorplans, buildingOptions }: ManagerSectionProps) {
  const [createState, createAction] = useFormState(createFloorplan, initialActionState)
  const formRef = useRef<HTMLFormElement>(null)
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(buildingOptions[0]?.id ?? "")
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)

  useEffect(() => {
    if (createState.status === "success") {
      formRef.current?.reset()
      setSelectedUnitId(null)
    }
  }, [createState.status])

  const unitOptions = useMemo(() => {
    const building = buildingOptions.find((option) => option.id === selectedBuildingId)
    return building?.units ?? []
  }, [buildingOptions, selectedBuildingId])

  useEffect(() => {
    if (unitOptions.length === 0) {
      setSelectedUnitId(null)
    }
  }, [unitOptions])

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload a floorplan</CardTitle>
          <CardDescription>
            Property managers can upload SVG or image files and associate them with specific units.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            ref={formRef}
            className="grid gap-4 md:grid-cols-2"
            action={createAction}
            encType="multipart/form-data"
          >
            <div className="space-y-2">
              <Label htmlFor="buildingId">Building</Label>
              <Select
                name="buildingId"
                value={selectedBuildingId}
                onValueChange={(value) => {
                  setSelectedBuildingId(value)
                  setSelectedUnitId(null)
                }}
              >
                <SelectTrigger id="buildingId">
                  <SelectValue placeholder="Select a building" />
                </SelectTrigger>
                <SelectContent>
                  {buildingOptions.length === 0 && <SelectItem value="">No buildings available</SelectItem>}
                  {buildingOptions.map((building) => (
                    <SelectItem key={building.id} value={building.id}>
                      {building.name ?? "Unnamed building"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitId">Unit</Label>
              <Select
                name="unitId"
                value={selectedUnitId ?? ""}
                onValueChange={(value) => setSelectedUnitId(value.length > 0 ? value : null)}
              >
                <SelectTrigger id="unitId">
                  <SelectValue placeholder="Applies to entire building" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Entire building</SelectItem>
                  {unitOptions.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.unitNumber ?? "Unit"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="Kitchen & Living" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={3} placeholder="Optional notes" />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="file">Floorplan file</Label>
              <Input id="file" name="file" type="file" accept=".svg,.png,.jpg,.jpeg,.webp" required />
              <p className="text-xs text-muted-foreground">
                SVG files allow precise overlays. Images are supported for quick uploads.
              </p>
            </div>

            <SubmitButton className="md:col-span-2">Upload floorplan</SubmitButton>

            {formatMessage(createState) && (
              <p
                className={cn(
                  "text-sm md:col-span-2",
                  createState.status === "error" ? "text-red-500" : "text-green-600",
                )}
              >
                {createState.message}
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {floorplans.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No floorplans yet</CardTitle>
              <CardDescription>Upload a floorplan to start creating overlays for tenants.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          floorplans.map((floorplan) => (
            <Card key={floorplan.id}>
              <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>{floorplan.name}</CardTitle>
                  <CardDescription>
                    {floorplan.building.name ?? "Unnamed building"}
                    {floorplan.unit ? ` • Unit ${floorplan.unit.unitNumber ?? ""}` : " • Building wide"}
                  </CardDescription>
                </div>
                <DeleteFloorplanForm floorplanId={floorplan.id} />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="overflow-hidden rounded-lg border">
                  {floorplan.signedUrl ? (
                    <Image
                      src={floorplan.signedUrl}
                      alt={`${floorplan.name} floorplan`}
                      width={1600}
                      height={1200}
                      className="max-h-[420px] w-full object-contain"
                      sizes="(min-width: 768px) 420px, 100vw"
                    />
                  ) : (
                    <div className="flex h-64 items-center justify-center bg-muted">
                      <p className="text-sm text-muted-foreground">No preview available</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <AnnotationDialog
                    floorplanId={floorplan.id}
                    availableProfiles={floorplan.availableProfiles}
                    mode="create"
                    triggerLabel="Add overlay"
                  />
                </div>

                <Separator />

                <div className="space-y-3">
                  {floorplan.annotations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No overlays created yet.</p>
                  ) : (
                    floorplan.annotations.map((annotation) => (
                      <div
                        key={annotation.id}
                        className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{labelFromType(annotation.annotationType)}</Badge>
                            <p className="font-medium">{annotation.label}</p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Assigned to {annotation.assigneeName ?? "all roommates"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <AnnotationDialog
                            floorplanId={floorplan.id}
                            availableProfiles={floorplan.availableProfiles}
                            mode="edit"
                            annotation={annotation}
                            triggerLabel="Edit"
                          />
                          <DeleteAnnotationForm annotationId={annotation.id} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </section>
  )
}

const labelFromType = (type: AnnotationClientModel["annotationType"]) => {
  const match = annotationTypes.find((entry) => entry.value === type)
  return match?.label ?? type
}

type AnnotationDialogProps = {
  floorplanId: string
  availableProfiles: { id: string; name: string | null }[]
  mode: "create" | "edit"
  triggerLabel: string
  annotation?: AnnotationClientModel
}

function AnnotationDialog({ floorplanId, availableProfiles, mode, triggerLabel, annotation }: AnnotationDialogProps) {
  const action = mode === "create" ? createAnnotation : updateAnnotation
  const [state, formAction] = useFormState(action, initialActionState)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (state.status === "success") {
      setOpen(false)
    }
  }, [state.status])

  const geometryDefault = annotation?.geometry ? JSON.stringify(annotation.geometry, null, 2) : ""
  const metadataDefault = annotation?.metadata ? JSON.stringify(annotation.metadata, null, 2) : ""
  const selectedType = annotation?.annotationType ?? annotationTypes[0].value
  const selectedProfile = annotation?.profileId ?? ""

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={mode === "create" ? "default" : "outline"}>{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add overlay" : "Edit overlay"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" action={formAction}>
          <input type="hidden" name="floorplanId" value={floorplanId} />
          {mode === "edit" && annotation && <input type="hidden" name="annotationId" value={annotation.id} />}

          <div className="space-y-2">
            <Label htmlFor="label">Label</Label>
            <Input id="label" name="label" defaultValue={annotation?.label ?? ""} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="annotationType">Category</Label>
            <Select name="annotationType" defaultValue={selectedType}>
              <SelectTrigger id="annotationType">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {annotationTypes.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profileId">Assigned roommate</Label>
            <Select name="profileId" defaultValue={selectedProfile}>
              <SelectTrigger id="profileId">
                <SelectValue placeholder="All roommates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All roommates</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {availableProfiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.name ?? "Roommate"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="geometry">Geometry JSON</Label>
            <Textarea
              id="geometry"
              name="geometry"
              rows={4}
              defaultValue={geometryDefault || '{"type":"rect","x":0.1,"y":0.1,"width":0.3,"height":0.25}'}
              required
            />
            <p className="text-xs text-muted-foreground">
              Provide normalised coordinates between 0 and 1. Example shown for rectangular overlays.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="metadata">Metadata JSON</Label>
            <Textarea id="metadata" name="metadata" rows={3} defaultValue={metadataDefault} />
            <p className="text-xs text-muted-foreground">
              Optional details such as color or notes. Leave blank for default styling.
            </p>
          </div>

          {formatMessage(state) && (
            <p className={`text-sm ${state.status === "error" ? "text-red-500" : "text-green-600"}`}>{state.message}</p>
          )}

          <DialogFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton>{mode === "create" ? "Create overlay" : "Save changes"}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

type DeleteAnnotationFormProps = {
  annotationId: string
}

function DeleteAnnotationForm({ annotationId }: DeleteAnnotationFormProps) {
  const [state, formAction] = useFormState(deleteAnnotation, initialActionState)

  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <input type="hidden" name="annotationId" value={annotationId} />
      <SubmitButton variant="destructive">Delete</SubmitButton>
      {state.status === "error" && <p className="text-sm text-red-500">{state.message}</p>}
    </form>
  )
}

type DeleteFloorplanFormProps = {
  floorplanId: string
}

function DeleteFloorplanForm({ floorplanId }: DeleteFloorplanFormProps) {
  const [state, formAction] = useFormState(deleteFloorplan, initialActionState)

  return (
    <form action={formAction} className="flex flex-col items-end gap-2">
      <input type="hidden" name="floorplanId" value={floorplanId} />
      <SubmitButton variant="destructive">Delete floorplan</SubmitButton>
      {state.status === "error" && <p className="text-sm text-red-500">{state.message}</p>}
    </form>
  )
}

type SubmitButtonProps = {
  children: ReactNode
  className?: string
  variant?: ComponentProps<typeof Button>["variant"]
}

function SubmitButton({ children, className, variant }: SubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      variant={variant ?? "default"}
      className={className}
      disabled={pending}
    >
      {pending ? "Saving..." : children}
    </Button>
  )
}
