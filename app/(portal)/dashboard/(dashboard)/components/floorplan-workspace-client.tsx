"use client"

import { useMemo, useState, type MouseEvent } from "react"
import { History, Layers, RotateCcw, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  canEditAnnotation,
  canManageAnyAnnotation,
  filterVisibleAnnotations,
  getAllowedMarkerTypes,
  type FloorplanAnnotation as PermissionAnnotation,
  type FloorplanMarkerType,
  type FloorplanRole,
  type FloorplanVisibilityScope,
} from "@/lib/floorplan-permissions"

import type {
  FloorplanAnnotation,
  FloorplanAnnotationVersion,
  FloorplanRoommate,
} from "../data"

const markerStyles: Record<FloorplanMarkerType, string> = {
  room: "bg-blue-600",
  storage: "bg-violet-600",
  chore: "bg-emerald-600",
}

type Props = {
  floorplanName: string
  svgMarkup: string
  currentVersion: number
  currentUserId: string
  currentUserRole: FloorplanRole
  roommates: FloorplanRoommate[]
  initialAnnotations: FloorplanAnnotation[]
  history: FloorplanAnnotationVersion[]
}

function toPermissionAnnotation(annotation: FloorplanAnnotation): PermissionAnnotation {
  return {
    id: annotation.id,
    markerType: annotation.markerType,
    label: annotation.label,
    note: annotation.note,
    x: annotation.x,
    y: annotation.y,
    createdBy: annotation.createdBy,
    visibleToUserIds: annotation.visibleToUserIds,
    visibilityScope: annotation.visibilityScope,
    version: annotation.version,
    updatedAt: annotation.updatedAt,
  }
}

export function FloorplanWorkspaceClient({
  floorplanName,
  svgMarkup,
  currentVersion,
  currentUserId,
  currentUserRole,
  roommates,
  initialAnnotations,
  history,
}: Props) {
  const [annotations, setAnnotations] = useState(initialAnnotations)
  const [selectedMarkerType, setSelectedMarkerType] = useState<FloorplanMarkerType>("storage")
  const [draftLabel, setDraftLabel] = useState("New marker")
  const [draftNote, setDraftNote] = useState("")
  const [visibilityScope, setVisibilityScope] = useState<FloorplanVisibilityScope>("all_roommates")
  const [selectedRoommates, setSelectedRoommates] = useState<string[]>([currentUserId])

  const visibleAnnotations = useMemo(
    () => filterVisibleAnnotations(annotations.map(toPermissionAnnotation), currentUserId),
    [annotations, currentUserId],
  )

  const allowedMarkerTypes = getAllowedMarkerTypes(currentUserRole)
  const canManageVersions = canManageAnyAnnotation(currentUserRole)

  function addAnnotation(x: number, y: number) {
    if (!allowedMarkerTypes.includes(selectedMarkerType)) {
      return
    }

    const newAnnotation: FloorplanAnnotation = {
      id: `draft-${crypto.randomUUID()}`,
      markerType: selectedMarkerType,
      label: draftLabel || "Untitled",
      note: draftNote || null,
      x,
      y,
      createdBy: currentUserId,
      visibleToUserIds:
        visibilityScope === "selected_roommates" ? selectedRoommates : visibilityScope === "private" ? [currentUserId] : [],
      visibilityScope,
      version: 1,
      updatedAt: new Date().toISOString(),
    }

    setAnnotations((prev) => [...prev, newAnnotation])
    setDraftLabel("New marker")
    setDraftNote("")
  }

  function rollbackToSnapshot(versionEntry: FloorplanAnnotationVersion) {
    if (!canManageVersions) {
      return
    }

    setAnnotations((prev) => prev.map((annotation) => (annotation.id === versionEntry.annotationId ? versionEntry.snapshot : annotation)))
  }

  function handleMapClick(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = Number((((event.clientX - rect.left) / rect.width) * 100).toFixed(2))
    const y = Number((((event.clientY - rect.top) / rect.height) * 100).toFixed(2))
    addAnnotation(x, y)
  }

  return (
    <CardContent>
      <Tabs defaultValue="viewer" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="viewer" className="gap-2 text-xs sm:text-sm">
            <Layers className="size-4" />
            Viewer
          </TabsTrigger>
          <TabsTrigger value="editor" className="gap-2 text-xs sm:text-sm">
            <Users className="size-4" />
            Editor
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 text-xs sm:text-sm">
            <History className="size-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="viewer" className="space-y-3">
          <p className="text-sm text-muted-foreground">{floorplanName} · version {currentVersion}</p>
          <div className="relative aspect-square w-full overflow-hidden rounded-lg border bg-slate-50">
            <div className="absolute inset-0" dangerouslySetInnerHTML={{ __html: svgMarkup }} />
            {visibleAnnotations.map((annotation) => (
              <div
                key={annotation.id}
                className="absolute"
                style={{ left: `${annotation.x}%`, top: `${annotation.y}%`, transform: "translate(-50%, -50%)" }}
              >
                <div className={`size-3 rounded-full ring-2 ring-white ${markerStyles[annotation.markerType]}`} />
              </div>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {visibleAnnotations.map((annotation) => (
              <div key={annotation.id} className="rounded-md border p-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{annotation.label}</p>
                  <Badge variant="outline" className="capitalize">
                    {annotation.markerType}
                  </Badge>
                </div>
                {annotation.note ? <p className="text-xs text-muted-foreground">{annotation.note}</p> : null}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="editor" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Tap/click on the floorplan to place a marker. Your role controls editable marker types.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3 rounded-lg border p-3">
              <Label htmlFor="marker-label">Marker label</Label>
              <Input id="marker-label" value={draftLabel} onChange={(event) => setDraftLabel(event.target.value)} />

              <Label htmlFor="marker-note">Marker note</Label>
              <Input id="marker-note" value={draftNote} onChange={(event) => setDraftNote(event.target.value)} />

              <div className="space-y-2">
                <Label>Marker type</Label>
                <div className="flex flex-wrap gap-2">
                  {(["room", "storage", "chore"] as FloorplanMarkerType[]).map((type) => {
                    const isAllowed = allowedMarkerTypes.includes(type)
                    return (
                      <Button
                        key={type}
                        size="sm"
                        variant={selectedMarkerType === type ? "default" : "outline"}
                        onClick={() => setSelectedMarkerType(type)}
                        disabled={!isAllowed}
                        className="capitalize"
                      >
                        {type}
                      </Button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Visibility</Label>
                <div className="flex flex-wrap gap-2">
                  {([
                    { value: "all_roommates", label: "All" },
                    { value: "selected_roommates", label: "Selected" },
                    { value: "private", label: "Private" },
                  ] as { value: FloorplanVisibilityScope; label: string }[]).map((option) => (
                    <Button
                      key={option.value}
                      size="sm"
                      variant={visibilityScope === option.value ? "default" : "outline"}
                      onClick={() => setVisibilityScope(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              {visibilityScope === "selected_roommates" ? (
                <div className="space-y-2">
                  <Label>Select roommates</Label>
                  <div className="flex flex-wrap gap-2">
                    {roommates.map((roommate) => {
                      const selected = selectedRoommates.includes(roommate.id)
                      return (
                        <Button
                          key={roommate.id}
                          size="sm"
                          variant={selected ? "default" : "outline"}
                          onClick={() =>
                            setSelectedRoommates((prev) =>
                              selected ? prev.filter((id) => id !== roommate.id) : [...prev, roommate.id],
                            )
                          }
                        >
                          {roommate.name}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            <div
              className="relative aspect-square w-full cursor-crosshair overflow-hidden rounded-lg border bg-slate-50"
              onClick={handleMapClick}
              aria-label="Floorplan editor canvas"
            >
              <div className="absolute inset-0" dangerouslySetInnerHTML={{ __html: svgMarkup }} />
              {annotations.map((annotation) => {
                const editable = canEditAnnotation(
                  toPermissionAnnotation(annotation),
                  currentUserRole,
                  currentUserId,
                )
                return (
                  <div
                    key={annotation.id}
                    className="absolute"
                    style={{ left: `${annotation.x}%`, top: `${annotation.y}%`, transform: "translate(-50%, -50%)" }}
                  >
                    <div
                      className={`size-3 rounded-full ring-2 ring-white ${markerStyles[annotation.markerType]} ${editable ? "opacity-100" : "opacity-40"}`}
                      title={`${annotation.label}${editable ? "" : " (read-only)"}`}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Annotation changes are versioned for audit and rollback.
          </p>
          <ul className="space-y-2">
            {history.map((versionEntry) => (
              <li key={versionEntry.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    {versionEntry.snapshot.label} · v{versionEntry.version}
                  </p>
                  <Badge variant="outline" className="capitalize">
                    {versionEntry.action}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Changed by {roommates.find((roommate) => roommate.id === versionEntry.changedBy)?.name ?? "System"} at{" "}
                  {new Date(versionEntry.changedAt).toLocaleString()}
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2"
                  onClick={() => rollbackToSnapshot(versionEntry)}
                  disabled={!canManageVersions}
                >
                  <RotateCcw className="mr-2 size-4" />
                  Roll back to this version
                </Button>
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>
    </CardContent>
  )
}
