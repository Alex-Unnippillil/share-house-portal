"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { createAnnotationAction, createFloorplanRecord, deleteAnnotationAction, markFloorplanUploadComplete, updateAnnotationAction } from "../actions"
import useSupabaseBrowser from "@/utils/supabase-browser"
import type { FloorplanAnnotation, FloorplanRecord, UnitRoster } from "@/types/floorplans"

interface BuildingOption {
  id: string
  name: string
  units: {
    id: string
    unitCode: string
  }[]
}

interface ViewerInfo {
  id: string
  name: string
  role: string
}

interface FloorplanExperienceProps {
  floorplans: FloorplanRecord[]
  rosters: UnitRoster[]
  buildings: BuildingOption[]
  viewer: ViewerInfo
}

const clampPercentage = (value: number) => {
  if (Number.isNaN(value)) {
    return 0
  }
  return Math.min(100, Math.max(0, value))
}

const defaultAnnotationTypes = [
  { label: "Note", value: "note" },
  { label: "Storage", value: "storage" },
  { label: "Chore", value: "chore" },
]

export default function FloorplanExperience({ floorplans, rosters, buildings, viewer }: FloorplanExperienceProps) {
  const router = useRouter()
  const supabase = useSupabaseBrowser()
  const { toast } = useToast()
  const [isUploading, startUploadTransition] = useTransition()
  const [isSavingAnnotation, startAnnotationTransition] = useTransition()
  const [deleteState, setDeleteState] = useState<string | null>(null)

  const isManager = viewer.role === "property_manager" || viewer.role === "admin"

  const [selectedFloorplanId, setSelectedFloorplanId] = useState(() => floorplans[0]?.id ?? "")
  const [activeRoommateId, setActiveRoommateId] = useState<string>("all")
  const [visibleTypes, setVisibleTypes] = useState<Set<string>>(
    () => new Set(floorplans[0]?.annotations.map(annotation => annotation.annotationType) ?? [])
  )
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})

  const [uploadForm, setUploadForm] = useState({
    buildingId: buildings[0]?.id ?? "",
    unitId: buildings[0]?.units[0]?.id ?? "",
    name: "",
  })
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  const [annotationForm, setAnnotationForm] = useState({
    label: "",
    annotationType: defaultAnnotationTypes[0]?.value ?? "note",
    color: "#f97316",
    notes: "",
    assignedProfileId: "unassigned",
    x: 50,
    y: 50,
    width: 20,
    height: 20,
  })
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null)

  const currentFloorplan = useMemo(
    () => floorplans.find(plan => plan.id === selectedFloorplanId) ?? floorplans[0],
    [floorplans, selectedFloorplanId]
  )

  const currentRoster = useMemo(
    () => rosters.find(roster => roster.unitId === currentFloorplan?.unitId),
    [rosters, currentFloorplan?.unitId]
  )

  useEffect(() => {
    if (!currentFloorplan) {
      return
    }

    const typeSet = new Set(currentFloorplan.annotations.map(annotation => annotation.annotationType))
    setVisibleTypes(previous => {
      if (previous.size === 0) {
        return typeSet
      }
      const next = new Set(previous)
      for (const type of typeSet) {
        next.add(type)
      }
      for (const type of Array.from(next)) {
        if (!typeSet.has(type)) {
          next.delete(type)
        }
      }
      return next
    })
    setActiveRoommateId("all")
  }, [currentFloorplan?.id])

  useEffect(() => {
    if (!currentFloorplan) {
      return
    }

    if (signedUrls[currentFloorplan.id]) {
      return
    }

    let cancelled = false
    const loadSignedUrl = async () => {
      const { data, error } = await supabase.storage.from("floorplans").createSignedUrl(currentFloorplan.assetPath, 60 * 15)
      if (cancelled) {
        return
      }
      if (error) {
        toast({
          title: "Unable to load floorplan",
          description: error.message,
          variant: "destructive",
        })
        return
      }
      if (data?.signedUrl) {
        setSignedUrls(previous => ({
          ...previous,
          [currentFloorplan.id]: data.signedUrl,
        }))
      }
    }

    void loadSignedUrl()

    return () => {
      cancelled = true
    }
  }, [currentFloorplan, supabase, toast, signedUrls])

  useEffect(() => {
    if (!uploadForm.buildingId && buildings[0]) {
      setUploadForm(previous => ({
        ...previous,
        buildingId: buildings[0]?.id ?? "",
        unitId: buildings[0]?.units[0]?.id ?? "",
      }))
    }
  }, [buildings, uploadForm.buildingId])

  const annotationTypes = useMemo(() => {
    const types = new Set<string>()
    floorplans.forEach(plan => plan.annotations.forEach(annotation => types.add(annotation.annotationType)))
    if (types.size === 0) {
      defaultAnnotationTypes.forEach(type => types.add(type.value))
    }
    return Array.from(types)
  }, [floorplans])

  const visibleAnnotations = useMemo(() => {
    if (!currentFloorplan) {
      return [] as FloorplanAnnotation[]
    }
    return currentFloorplan.annotations.filter(annotation => {
      const matchesType = visibleTypes.size === 0 || visibleTypes.has(annotation.annotationType)
      if (!matchesType) {
        return false
      }
      if (activeRoommateId === "all") {
        return true
      }
      if (activeRoommateId === "unassigned") {
        return !annotation.assignedProfileId
      }
      return annotation.assignedProfileId === activeRoommateId
    })
  }, [currentFloorplan, visibleTypes, activeRoommateId])

  const handleToggleType = (type: string) => {
    setVisibleTypes(previous => {
      const next = new Set(previous)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  const handleUploadSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!uploadForm.buildingId || !uploadForm.unitId || !uploadForm.name || !uploadFile) {
      toast({ title: "Missing details", description: "Please provide a file, name, building, and unit." })
      return
    }

    startUploadTransition(async () => {
      try {
        const record = await createFloorplanRecord({
          buildingId: uploadForm.buildingId,
          unitId: uploadForm.unitId,
          name: uploadForm.name,
          fileName: uploadFile.name,
          contentType: uploadFile.type,
        })

        const { error: uploadError } = await supabase.storage
          .from("floorplans")
          .upload(record.asset_path, uploadFile, {
            cacheControl: "3600",
            upsert: true,
            contentType: uploadFile.type,
          })

        if (uploadError) {
          throw uploadError
        }

        await markFloorplanUploadComplete({
          floorplanId: record.id,
          contentType: uploadFile.type,
        })

        toast({ title: "Floorplan uploaded" })
        setUploadForm({
          buildingId: record.building_id,
          unitId: record.unit_id,
          name: "",
        })
        setUploadFile(null)
        router.refresh()
      } catch (error) {
        const message = error instanceof Error ? error.message : "Something went wrong during upload"
        toast({ title: "Upload failed", description: message, variant: "destructive" })
      }
    })
  }

  const resetAnnotationForm = () => {
    setAnnotationForm({
      label: "",
      annotationType: defaultAnnotationTypes[0]?.value ?? "note",
      color: "#f97316",
      notes: "",
      assignedProfileId: "unassigned",
      x: 50,
      y: 50,
      width: 20,
      height: 20,
    })
    setEditingAnnotationId(null)
  }

  const handleAnnotationSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!currentFloorplan) {
      toast({ title: "No floorplan selected", variant: "destructive" })
      return
    }
    if (!annotationForm.label.trim()) {
      toast({ title: "Annotation label required", variant: "destructive" })
      return
    }

    const geometry = {
      x: clampPercentage(annotationForm.x),
      y: clampPercentage(annotationForm.y),
      width: clampPercentage(annotationForm.width),
      height: clampPercentage(annotationForm.height),
    }

    startAnnotationTransition(async () => {
      try {
        if (editingAnnotationId) {
          await updateAnnotationAction({
            annotationId: editingAnnotationId,
            floorplanId: currentFloorplan.id,
            label: annotationForm.label,
            annotationType: annotationForm.annotationType,
            color: annotationForm.color,
            notes: annotationForm.notes,
            assignedProfileId: annotationForm.assignedProfileId === "unassigned" ? null : annotationForm.assignedProfileId,
            geometry,
          })
          toast({ title: "Annotation updated" })
        } else {
          await createAnnotationAction({
            floorplanId: currentFloorplan.id,
            label: annotationForm.label,
            annotationType: annotationForm.annotationType,
            color: annotationForm.color,
            notes: annotationForm.notes,
            assignedProfileId: annotationForm.assignedProfileId === "unassigned" ? null : annotationForm.assignedProfileId,
            geometry,
          })
          toast({ title: "Annotation created" })
        }
        resetAnnotationForm()
        router.refresh()
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to save annotation"
        toast({ title: "Annotation error", description: message, variant: "destructive" })
      }
    })
  }

  const handleEditAnnotation = (annotation: FloorplanAnnotation) => {
    setEditingAnnotationId(annotation.id)
    setAnnotationForm({
      label: annotation.label,
      annotationType: annotation.annotationType,
      color: annotation.color ?? "#f97316",
      notes: annotation.notes ?? "",
      assignedProfileId: annotation.assignedProfileId ?? "unassigned",
      x: Math.round(annotation.geometry.x ?? 50),
      y: Math.round(annotation.geometry.y ?? 50),
      width: Math.round((annotation.geometry.width ?? 20) || 20),
      height: Math.round((annotation.geometry.height ?? 20) || 20),
    })
  }

  const handleDeleteAnnotation = async (annotation: FloorplanAnnotation) => {
    if (!currentFloorplan) {
      return
    }
    const confirmed = window.confirm(`Remove annotation "${annotation.label}"?`)
    if (!confirmed) {
      return
    }
    setDeleteState(annotation.id)
    try {
      await deleteAnnotationAction(annotation.id, currentFloorplan.id)
      toast({ title: "Annotation removed" })
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete annotation"
      toast({ title: "Deletion failed", description: message, variant: "destructive" })
    } finally {
      setDeleteState(null)
    }
  }

  const activeSignedUrl = currentFloorplan ? signedUrls[currentFloorplan.id] : undefined

  const buildingUnits = useMemo(() => {
    const building = buildings.find(option => option.id === uploadForm.buildingId)
    return building?.units ?? []
  }, [buildings, uploadForm.buildingId])

  useEffect(() => {
    if (!buildingUnits.some(unit => unit.id === uploadForm.unitId)) {
      setUploadForm(previous => ({
        ...previous,
        unitId: buildingUnits[0]?.id ?? "",
      }))
    }
  }, [buildingUnits, uploadForm.unitId])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Floorplans</h1>
        <p className="text-muted-foreground">
          View annotated layouts, toggle overlays, and review how storage areas and chores are assigned across roommates.
        </p>
      </div>

      {floorplans.length > 0 ? (
        <Card>
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Selected floorplan</CardTitle>
              <CardDescription>
                Choose a floorplan to see roommate overlays and assignments.
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Label htmlFor="floorplan-select" className="text-sm font-medium">
                Floorplan
              </Label>
              <Select
                value={currentFloorplan?.id ?? ""}
                onValueChange={value => setSelectedFloorplanId(value)}
              >
                <SelectTrigger id="floorplan-select" className="w-72">
                  <SelectValue placeholder="Select floorplan" />
                </SelectTrigger>
                <SelectContent>
                  {floorplans.map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-lg border bg-muted/30">
                  {activeSignedUrl ? (
                    <div className="relative">
                      <img
                        src={activeSignedUrl}
                        alt={currentFloorplan?.name ?? "Floorplan"}
                        className="h-auto w-full"
                      />
                      <div className="pointer-events-none absolute inset-0">
                        {visibleAnnotations.map(annotation => {
                          const left = `${annotation.geometry.x ?? 0}%`
                          const top = `${annotation.geometry.y ?? 0}%`
                          const width = annotation.geometry.width
                            ? `${annotation.geometry.width}%`
                            : undefined
                          const height = annotation.geometry.height
                            ? `${annotation.geometry.height}%`
                            : undefined
                          return (
                            <div
                              key={annotation.id}
                              className="absolute"
                              style={{ left, top, width, height }}
                            >
                              <span
                                className="inline-flex items-center gap-1 rounded-md bg-background/80 px-2 py-1 text-xs font-medium shadow"
                                style={{ borderColor: annotation.color ?? "#f97316", borderWidth: 1 }}
                              >
                                <span
                                  className="size-2 rounded-full"
                                  style={{ backgroundColor: annotation.color ?? "#f97316" }}
                                />
                                {annotation.label}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-72 items-center justify-center text-muted-foreground">
                      Upload pending or no preview available.
                    </div>
                  )}
                </div>
                <Card className="border-dashed bg-background">
                  <CardHeader>
                    <CardTitle className="text-lg">Overlay filters</CardTitle>
                    <CardDescription>Show or hide overlays by roommate and annotation type.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Roommate filter</Label>
                      <Select value={activeRoommateId} onValueChange={setActiveRoommateId}>
                        <SelectTrigger className="w-64">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All roommates</SelectItem>
                          <SelectItem value="unassigned">Unassigned overlays</SelectItem>
                          {currentRoster?.tenants.map(tenant => (
                            <SelectItem key={tenant.id} value={tenant.id}>
                              {tenant.fullName ?? "Unnamed occupant"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Overlay types</Label>
                      <div className="flex flex-wrap gap-3">
                        {annotationTypes.map(type => (
                          <label key={type} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={visibleTypes.has(type)}
                              onCheckedChange={() => handleToggleType(type)}
                            />
                            <span className="capitalize">{type.replace(/-/g, " ")}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Assignments</CardTitle>
                    <CardDescription>See who is responsible for each annotated area.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {visibleAnnotations.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No overlays match the current filters.</p>
                    ) : (
                      visibleAnnotations.map(annotation => (
                        <div
                          key={annotation.id}
                          className="rounded-lg border bg-background p-3 text-sm"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium">{annotation.label}</div>
                            <Badge variant="secondary" className="capitalize">
                              {annotation.annotationType}
                            </Badge>
                          </div>
                          <div className="mt-1 text-muted-foreground">
                            {annotation.notes ?? "No notes"}
                          </div>
                          <Separator className="my-2" />
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium">Assigned to</span>
                            <span>
                              {annotation.assignedProfileId
                                ? currentRoster?.tenants.find(tenant => tenant.id === annotation.assignedProfileId)?.fullName ??
                                  "Roommate"
                                : "Unassigned"}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
                {currentRoster && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Roommates</CardTitle>
                      <CardDescription>Everyone linked to this unit.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {currentRoster.tenants.length === 0 ? (
                        <p className="text-muted-foreground">No occupants assigned.</p>
                      ) : (
                        currentRoster.tenants.map(tenant => (
                          <div key={tenant.id} className="flex items-center justify-between">
                            <span>{tenant.fullName ?? "Unnamed occupant"}</span>
                            <Badge variant="outline" className="capitalize">
                              {tenant.role ?? "tenant"}
                            </Badge>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No floorplans yet</CardTitle>
            <CardDescription>
              Once property managers upload floorplans, you&apos;ll see roommate overlays and assignments here.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {isManager && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Upload floorplan</CardTitle>
              <CardDescription>Upload SVG or image files and link them to a building and unit.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleUploadSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="floorplan-name">Name</Label>
                  <Input
                    id="floorplan-name"
                    value={uploadForm.name}
                    onChange={event => setUploadForm(previous => ({ ...previous, name: event.target.value }))}
                    placeholder="e.g. Unit 3B Layout"
                    required
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Building</Label>
                    <Select
                      value={uploadForm.buildingId}
                      onValueChange={value => setUploadForm(previous => ({
                        ...previous,
                        buildingId: value,
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select building" />
                      </SelectTrigger>
                      <SelectContent>
                        {buildings.map(building => (
                          <SelectItem key={building.id} value={building.id}>
                            {building.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Select
                      value={uploadForm.unitId}
                      onValueChange={value => setUploadForm(previous => ({ ...previous, unitId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {buildingUnits.map(unit => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.unitCode}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="floorplan-file">Floorplan file</Label>
                  <Input
                    id="floorplan-file"
                    type="file"
                    accept=".svg,.png,.jpg,.jpeg,.webp"
                    onChange={event => setUploadFile(event.target.files?.[0] ?? null)}
                    required
                  />
                </div>
                <Button type="submit" disabled={isUploading}>
                  {isUploading ? "Uploading..." : "Upload floorplan"}
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{editingAnnotationId ? "Edit annotation" : "Create annotation"}</CardTitle>
              <CardDescription>
                Highlight storage areas, chores, or notes and assign them to specific roommates.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleAnnotationSubmit}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="annotation-label">Label</Label>
                    <Input
                      id="annotation-label"
                      value={annotationForm.label}
                      onChange={event => setAnnotationForm(previous => ({ ...previous, label: event.target.value }))}
                      placeholder="Pantry"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="annotation-type">Type</Label>
                    <Select
                      value={annotationForm.annotationType}
                      onValueChange={value => setAnnotationForm(previous => ({ ...previous, annotationType: value }))}
                    >
                      <SelectTrigger id="annotation-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {annotationTypes.map(type => (
                          <SelectItem key={type} value={type} className="capitalize">
                            {type.replace(/-/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="annotation-color">Color</Label>
                    <Input
                      id="annotation-color"
                      type="color"
                      value={annotationForm.color}
                      onChange={event => setAnnotationForm(previous => ({ ...previous, color: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Assigned roommate</Label>
                    <Select
                      value={annotationForm.assignedProfileId}
                      onValueChange={value => setAnnotationForm(previous => ({ ...previous, assignedProfileId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {currentRoster?.tenants.map(tenant => (
                          <SelectItem key={tenant.id} value={tenant.id}>
                            {tenant.fullName ?? "Unnamed occupant"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="position-x">X position (%)</Label>
                    <Input
                      id="position-x"
                      type="number"
                      min={0}
                      max={100}
                      value={annotationForm.x}
                      onChange={event =>
                        setAnnotationForm(previous => ({ ...previous, x: Number(event.target.value) }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position-y">Y position (%)</Label>
                    <Input
                      id="position-y"
                      type="number"
                      min={0}
                      max={100}
                      value={annotationForm.y}
                      onChange={event =>
                        setAnnotationForm(previous => ({ ...previous, y: Number(event.target.value) }))
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="size-width">Width (%)</Label>
                    <Input
                      id="size-width"
                      type="number"
                      min={0}
                      max={100}
                      value={annotationForm.width}
                      onChange={event =>
                        setAnnotationForm(previous => ({ ...previous, width: Number(event.target.value) }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="size-height">Height (%)</Label>
                    <Input
                      id="size-height"
                      type="number"
                      min={0}
                      max={100}
                      value={annotationForm.height}
                      onChange={event =>
                        setAnnotationForm(previous => ({ ...previous, height: Number(event.target.value) }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="annotation-notes">Notes</Label>
                  <Textarea
                    id="annotation-notes"
                    value={annotationForm.notes}
                    onChange={event => setAnnotationForm(previous => ({ ...previous, notes: event.target.value }))}
                    placeholder="Label shelves, describe cleaning cadence, etc."
                    rows={3}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button type="submit" disabled={isSavingAnnotation}>
                    {isSavingAnnotation ? "Saving..." : editingAnnotationId ? "Update annotation" : "Create annotation"}
                  </Button>
                  {editingAnnotationId && (
                    <Button type="button" variant="ghost" onClick={resetAnnotationForm}>
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
              <Separator className="my-4" />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Existing overlays</h3>
                {currentFloorplan?.annotations.length ? (
                  <div className="space-y-2">
                    {currentFloorplan.annotations.map(annotation => (
                      <div
                        key={annotation.id}
                        className={cn(
                          "flex items-start justify-between gap-3 rounded-md border p-3 text-sm",
                          editingAnnotationId === annotation.id && "border-primary"
                        )}
                      >
                        <div className="space-y-1">
                          <div className="font-medium">{annotation.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {annotation.annotationType} • {annotation.assignedProfileId
                              ? currentRoster?.tenants.find(tenant => tenant.id === annotation.assignedProfileId)?.fullName ??
                                "Roommate"
                              : "Unassigned"}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEditAnnotation(annotation)}>
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => void handleDeleteAnnotation(annotation)}
                            disabled={deleteState === annotation.id}
                          >
                            {deleteState === annotation.id ? "Removing..." : "Delete"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No overlays yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
