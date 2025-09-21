"use client"

import { useMemo, useState, type FormEvent } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import type {
  FloorplanAssignmentSummary,
  FloorplanSummary,
  ResidentSummary,
} from "@/types/floorplans"
import useSupabaseBrowser from "@/utils/supabase-browser"

const selectStyles =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"

interface FloorplanAdminPanelProps {
  floorplans: FloorplanSummary[]
  residents: ResidentSummary[]
  assignments: FloorplanAssignmentSummary[]
}

const STAFF_SUCCESS_MESSAGE = "Floorplan data saved successfully."

const sanitizeNumber = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string") return null
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

export default function FloorplanAdminPanel({
  floorplans: initialFloorplans,
  residents,
  assignments: initialAssignments,
}: FloorplanAdminPanelProps) {
  const supabase = useSupabaseBrowser()
  const [floorplans, setFloorplans] = useState(initialFloorplans)
  const [assignments, setAssignments] = useState(initialAssignments)
  const [creatingFloorplan, setCreatingFloorplan] = useState(false)
  const [creatingOverlay, setCreatingOverlay] = useState(false)
  const [creatingAssignment, setCreatingAssignment] = useState(false)
  const [overlayFloorplanId, setOverlayFloorplanId] = useState(
    initialFloorplans[0]?.id ?? ""
  )
  const [overlayType, setOverlayType] = useState("room")
  const [overlayOccupantId, setOverlayOccupantId] = useState<string | null>(null)
  const [assignmentFloorplanId, setAssignmentFloorplanId] = useState(
    initialFloorplans[0]?.id ?? ""
  )
  const [assignmentResidentId, setAssignmentResidentId] = useState(
    residents[0]?.id ?? ""
  )
  const [assignmentIsPrimary, setAssignmentIsPrimary] = useState(true)

  const selectedOverlayFloorplan = useMemo(
    () => floorplans.find((item) => item.id === overlayFloorplanId) ?? null,
    [floorplans, overlayFloorplanId]
  )

  const sortedAssignments = useMemo(() => {
    return [...assignments].sort((a, b) =>
      (b.effective_start ?? "").localeCompare(a.effective_start ?? "")
    )
  }, [assignments])

  const handleCreateFloorplan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)

    const name = (formData.get("name") as string)?.trim()
    const unitLabel = (formData.get("unitLabel") as string)?.trim()
    const description = (formData.get("description") as string)?.trim()
    const file = formData.get("baseImage") as File | null

    if (!name || !unitLabel) {
      toast({
        title: "Missing fields",
        description: "Name and unit label are required to create a floorplan.",
        variant: "destructive",
      })
      return
    }

    if (!file || file.size === 0) {
      toast({
        title: "Upload required",
        description: "Please upload a base image before saving the floorplan.",
        variant: "destructive",
      })
      return
    }

    try {
      setCreatingFloorplan(true)
      const floorplanId = crypto.randomUUID()
      const extension = file.name.split(".").pop() ?? "png"
      const storagePath = `${floorplanId}/base-${Date.now()}.${extension}`

      const { error: uploadError } = await supabase.storage
        .from("floorplans")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type,
        })

      if (uploadError) {
        throw uploadError
      }

      const { data, error } = await supabase
        .from("floorplans")
        .insert({
          id: floorplanId,
          name,
          unit_label: unitLabel,
          description: description?.length ? description : null,
          base_image_bucket: "floorplans",
          base_image_path: storagePath,
        })
        .select(
          "id, name, unit_label, description, base_image_bucket, base_image_path, is_active"
        )
        .single()

      if (error || !data) {
        throw error ?? new Error("Failed to save floorplan")
      }

      setFloorplans((previous) => [
        ...previous,
        { ...data, overlays: [], assignments: [] },
      ])

      if (!overlayFloorplanId) {
        setOverlayFloorplanId(data.id)
      }

      if (!assignmentFloorplanId) {
        setAssignmentFloorplanId(data.id)
      }

      toast({ title: "Floorplan created", description: STAFF_SUCCESS_MESSAGE })
      form.reset()
    } catch (error) {
      console.error(error)
      toast({
        title: "Unable to create floorplan",
        description:
          error instanceof Error ? error.message : "Upload or insert failed.",
        variant: "destructive",
      })
    } finally {
      setCreatingFloorplan(false)
    }
  }

  const handleCreateOverlay = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!overlayFloorplanId) {
      toast({
        title: "Select a floorplan",
        description: "Choose a floorplan before adding overlays.",
        variant: "destructive",
      })
      return
    }

    const formData = new FormData(event.currentTarget)
    const name = (formData.get("overlayName") as string)?.trim()
    const x = sanitizeNumber(formData.get("overlayX"))
    const y = sanitizeNumber(formData.get("overlayY"))
    const width = sanitizeNumber(formData.get("overlayWidth"))
    const height = sanitizeNumber(formData.get("overlayHeight"))
    const fillColor = (formData.get("fillColor") as string)?.trim()
    const strokeColor = (formData.get("strokeColor") as string)?.trim()
    const amenitiesRaw = (formData.get("amenities") as string)?.trim()
    const notes = (formData.get("notes") as string)?.trim()

    if (!name || x === null || y === null || width === null || height === null) {
      toast({
        title: "Incomplete overlay",
        description: "Name, position, and size are required for overlays.",
        variant: "destructive",
      })
      return
    }

    const metadata: Record<string, unknown> = {}
    if (fillColor) metadata.fillColor = fillColor
    if (strokeColor) metadata.strokeColor = strokeColor
    if (amenitiesRaw) {
      const amenities = amenitiesRaw
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
      if (amenities.length) {
        metadata.amenities = amenities
      }
    }
    if (notes) metadata.notes = notes

    const geometry = {
      type: "rect" as const,
      x,
      y,
      width,
      height,
    }

    try {
      setCreatingOverlay(true)
      const displayOrder =
        selectedOverlayFloorplan?.overlays?.length ?? 0

      const { data, error } = await supabase
        .from("floorplan_overlays")
        .insert({
          floorplan_id: overlayFloorplanId,
          name,
          overlay_type: overlayType,
          geometry,
          metadata: Object.keys(metadata).length ? metadata : null,
          is_interactive: true,
          occupant_profile_id: overlayOccupantId,
          display_order: displayOrder,
        })
        .select("id, name, overlay_type, display_order")
        .single()

      if (error || !data) {
        throw error ?? new Error("Overlay insert failed")
      }

      setFloorplans((previous) =>
        previous.map((item) =>
          item.id === overlayFloorplanId
            ? {
                ...item,
                overlays: [
                  ...(item.overlays ?? []),
                  {
                    id: data.id,
                    name: data.name,
                    overlay_type: data.overlay_type,
                    display_order: data.display_order ?? displayOrder,
                  },
                ],
              }
            : item
        )
      )

      toast({ title: "Overlay added", description: STAFF_SUCCESS_MESSAGE })
      event.currentTarget.reset()
      setOverlayOccupantId(null)
    } catch (error) {
      console.error(error)
      toast({
        title: "Unable to save overlay",
        description:
          error instanceof Error ? error.message : "Unexpected error creating overlay.",
        variant: "destructive",
      })
    } finally {
      setCreatingOverlay(false)
    }
  }

  const handleCreateAssignment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!assignmentFloorplanId || !assignmentResidentId) {
      toast({
        title: "Missing data",
        description: "Choose both a floorplan and resident before assigning.",
        variant: "destructive",
      })
      return
    }

    const formData = new FormData(event.currentTarget)
    const effectiveStart = (formData.get("effectiveStart") as string)?.trim()
    const effectiveEnd = (formData.get("effectiveEnd") as string)?.trim()

    try {
      setCreatingAssignment(true)
      const { data, error } = await supabase
        .from("resident_floorplans")
        .insert({
          floorplan_id: assignmentFloorplanId,
          resident_id: assignmentResidentId,
          effective_start: effectiveStart?.length ? effectiveStart : undefined,
          effective_end: effectiveEnd?.length ? effectiveEnd : null,
          is_primary: assignmentIsPrimary,
        })
        .select(
          "id, floorplan_id, resident_id, effective_start, effective_end, is_primary, created_at, updated_at"
        )
        .single()

      if (error || !data) {
        throw error ?? new Error("Failed to assign floorplan")
      }

      const resident = residents.find((item) => item.id === assignmentResidentId)
      const floorplan = floorplans.find((item) => item.id === assignmentFloorplanId)

      setAssignments((previous) => [
        {
          ...data,
          resident: resident
            ? {
                id: resident.id,
                full_name: resident.full_name ?? null,
                email: resident.email ?? null,
              }
            : null,
          floorplan: floorplan
            ? {
                id: floorplan.id,
                name: floorplan.name,
                unit_label: floorplan.unit_label,
              }
            : null,
        },
        ...previous,
      ])

      setFloorplans((previous) =>
        previous.map((item) =>
          item.id === assignmentFloorplanId
            ? {
                ...item,
                assignments: [
                  ...(item.assignments ?? []),
                  {
                    id: data.id,
                    resident_id: data.resident_id,
                    effective_start: data.effective_start,
                    effective_end: data.effective_end,
                  },
                ],
              }
            : item
        )
      )

      toast({ title: "Assignment created", description: STAFF_SUCCESS_MESSAGE })
      event.currentTarget.reset()
    } catch (error) {
      console.error(error)
      toast({
        title: "Unable to assign floorplan",
        description:
          error instanceof Error ? error.message : "Unexpected error assigning resident.",
        variant: "destructive",
      })
    } finally {
      setCreatingAssignment(false)
    }
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Upload a floorplan</CardTitle>
          <CardDescription>
            Create a new base floorplan image before layering overlays or assigning residents.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleCreateFloorplan} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="floorplan-name">Floorplan name</Label>
                <Input id="floorplan-name" name="name" placeholder="3B/2B - North Tower" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="floorplan-unit">Unit label</Label>
                <Input id="floorplan-unit" name="unitLabel" placeholder="Unit 4A" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="floorplan-description">Description</Label>
              <Textarea
                id="floorplan-description"
                name="description"
                placeholder="Notes about square footage, orientation, or floor-specific remarks."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="floorplan-image">Base image</Label>
              <Input id="floorplan-image" type="file" accept="image/*" name="baseImage" required />
            </div>
            <Button type="submit" disabled={creatingFloorplan}>
              {creatingFloorplan ? "Uploading..." : "Save floorplan"}
            </Button>
          </form>
          {floorplans.length ? (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                Existing floorplans ({floorplans.length})
              </h3>
              <ul className="grid gap-2 md:grid-cols-2">
                {floorplans.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-md border bg-muted/30 p-3 text-sm"
                  >
                    <p className="font-medium">{item.name}</p>
                    <p className="text-muted-foreground">Unit {item.unit_label}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>{item.overlays?.length ?? 0} overlays</span>
                      <span>{item.assignments?.length ?? 0} assignments</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage overlays</CardTitle>
          <CardDescription>
            Draw overlay rectangles with colors, amenities, and resident assignments.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleCreateOverlay} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="overlay-floorplan">Floorplan</Label>
                <select
                  id="overlay-floorplan"
                  className={selectStyles}
                  value={overlayFloorplanId}
                  onChange={(event) => setOverlayFloorplanId(event.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select a floorplan
                  </option>
                  {floorplans.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} · {item.unit_label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="overlay-type">Overlay type</Label>
                <select
                  id="overlay-type"
                  className={selectStyles}
                  value={overlayType}
                  onChange={(event) => setOverlayType(event.target.value)}
                >
                  <option value="room">Room</option>
                  <option value="amenity">Amenity</option>
                  <option value="note">Note</option>
                </select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="overlay-x">X</Label>
                <Input id="overlay-x" name="overlayX" type="number" step="0.1" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="overlay-y">Y</Label>
                <Input id="overlay-y" name="overlayY" type="number" step="0.1" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="overlay-width">Width</Label>
                <Input
                  id="overlay-width"
                  name="overlayWidth"
                  type="number"
                  step="0.1"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="overlay-height">Height</Label>
                <Input
                  id="overlay-height"
                  name="overlayHeight"
                  type="number"
                  step="0.1"
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="overlay-name">Overlay name</Label>
                <Input id="overlay-name" name="overlayName" placeholder="Bedroom A" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="overlay-occupant">Occupant (optional)</Label>
                <select
                  id="overlay-occupant"
                  className={selectStyles}
                  value={overlayOccupantId ?? ""}
                  onChange={(event) =>
                    setOverlayOccupantId(event.target.value || null)
                  }
                >
                  <option value="">Unassigned</option>
                  {residents.map((resident) => (
                    <option key={resident.id} value={resident.id}>
                      {resident.full_name ?? resident.email ?? resident.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="overlay-fill">Fill color</Label>
                <Input id="overlay-fill" name="fillColor" type="color" defaultValue="#2563eb" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="overlay-stroke">Stroke color</Label>
                <Input id="overlay-stroke" name="strokeColor" type="color" defaultValue="#1d4ed8" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="overlay-amenities">Amenities (comma separated)</Label>
              <Input
                id="overlay-amenities"
                name="amenities"
                placeholder="Wardrobe, Balcony access"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="overlay-notes">Notes</Label>
              <Textarea
                id="overlay-notes"
                name="notes"
                placeholder="Include special cleaning instructions or amenity highlights."
              />
            </div>
            <Button type="submit" disabled={creatingOverlay}>
              {creatingOverlay ? "Saving overlay..." : "Add overlay"}
            </Button>
          </form>
          {selectedOverlayFloorplan?.overlays?.length ? (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                Overlays for {selectedOverlayFloorplan.name}
              </h3>
              <div className="flex flex-wrap gap-2">
                {selectedOverlayFloorplan.overlays
                  .slice()
                  .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
                  .map((overlay) => (
                    <Badge key={overlay.id} variant="outline">
                      {overlay.name} · {overlay.overlay_type}
                    </Badge>
                  ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assign to residents</CardTitle>
          <CardDescription>
            Map floorplans to tenants with effective dates to control visibility.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateAssignment} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="assignment-resident">Resident</Label>
                <select
                  id="assignment-resident"
                  className={selectStyles}
                  value={assignmentResidentId}
                  onChange={(event) => setAssignmentResidentId(event.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select a resident
                  </option>
                  {residents.map((resident) => (
                    <option key={resident.id} value={resident.id}>
                      {resident.full_name ?? resident.email ?? resident.id}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignment-floorplan">Floorplan</Label>
                <select
                  id="assignment-floorplan"
                  className={selectStyles}
                  value={assignmentFloorplanId}
                  onChange={(event) => setAssignmentFloorplanId(event.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select a floorplan
                  </option>
                  {floorplans.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} · {item.unit_label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="assignment-start">Effective start</Label>
                <Input id="assignment-start" type="date" name="effectiveStart" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignment-end">Effective end</Label>
                <Input id="assignment-end" type="date" name="effectiveEnd" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="assignment-primary"
                type="checkbox"
                className="size-4 rounded border border-input"
                checked={assignmentIsPrimary}
                onChange={(event) => setAssignmentIsPrimary(event.target.checked)}
              />
              <Label htmlFor="assignment-primary" className="font-normal">
                Primary assignment
              </Label>
            </div>
            <Button type="submit" disabled={creatingAssignment}>
              {creatingAssignment ? "Saving assignment..." : "Assign floorplan"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent assignments</CardTitle>
          <CardDescription>Track tenant access windows for auditing.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedAssignments.length ? (
            <ul className="space-y-3 text-sm">
              {sortedAssignments.slice(0, 10).map((assignment) => (
                <li key={assignment.id} className="rounded-md border p-3">
                  <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium">
                        {assignment.resident?.full_name ?? assignment.resident?.email ?? "Resident"}
                      </p>
                      <p className="text-muted-foreground">
                        {assignment.floorplan?.name} · Unit {assignment.floorplan?.unit_label}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <p>Start: {assignment.effective_start ?? "Immediate"}</p>
                      <p>End: {assignment.effective_end ?? "Open"}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No assignments yet. Create one to allow tenants to view floorplans.
            </p>
          )}
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            Floorplan visibility obeys effective dates and primary assignment status.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
