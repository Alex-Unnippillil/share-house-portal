"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import type { AnnotationType, FloorplanClientModel, MembershipClientModel } from "../types"

const annotationTypeLabels: Record<AnnotationType, string> = {
  storage: "Storage",
  chore: "Chore",
  note: "Note",
  other: "Other",
}

const annotationColors: Record<AnnotationType, string> = {
  storage: "#2563eb",
  chore: "#16a34a",
  note: "#eab308",
  other: "#a855f7",
}

type TenantSectionProps = {
  floorplans: FloorplanClientModel[]
  memberships: MembershipClientModel[]
  profileId: string
}

type RoommateFilter = "all" | "self" | "unassigned" | string

type RoommateOption = {
  id: string
  label: string
}

export default function TenantSection({ floorplans, memberships, profileId }: TenantSectionProps) {
  const roommateOptions = useMemo<RoommateOption[]>(() => {
    const unique = new Map<string, string>()

    unique.set("all", "All roommates")
    unique.set("self", "My overlays")
    unique.set("unassigned", "Unassigned overlays")

    for (const membership of memberships) {
      const id = membership.profile?.id
      if (!id) {
        continue
      }
      const label = membership.profile?.fullName ?? "Roommate"
      unique.set(id, label)
    }

    return Array.from(unique.entries()).map(([id, label]) => ({ id, label }))
  }, [memberships])

  const allTypes = useMemo(() => {
    const typeSet = new Set<AnnotationType>()
    for (const floorplan of floorplans) {
      for (const annotation of floorplan.annotations) {
        typeSet.add(annotation.annotationType)
      }
    }
    return Array.from(typeSet)
  }, [floorplans])

  const [roommateFilter, setRoommateFilter] = useState<RoommateFilter>("all")
  const [activeTypes, setActiveTypes] = useState<Set<AnnotationType>>(new Set(allTypes))

  useEffect(() => {
    setActiveTypes(new Set(allTypes))
  }, [allTypes])

  const toggleType = (type: AnnotationType) => {
    setActiveTypes((current) => {
      const next = new Set(current)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  const filteredFloorplans = useMemo(() => {
    return floorplans.map((floorplan) => {
      let annotations = floorplan.annotations

      if (roommateFilter === "self") {
        annotations = annotations.filter((annotation) => annotation.profileId === profileId)
      } else if (roommateFilter === "unassigned") {
        annotations = annotations.filter((annotation) => annotation.profileId == null)
      } else if (roommateFilter !== "all") {
        annotations = annotations.filter((annotation) => annotation.profileId === roommateFilter)
      }

      if (activeTypes.size > 0) {
        annotations = annotations.filter((annotation) => activeTypes.has(annotation.annotationType))
      } else {
        annotations = []
      }

      return {
        ...floorplan,
        annotations,
      }
    })
  }, [activeTypes, floorplans, profileId, roommateFilter])

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Roommate overlays</CardTitle>
          <CardDescription>
            Toggle overlays to see storage assignments, chores, and roommate notes for your home.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="roommate-filter">Roommate</Label>
            <Select
              value={roommateFilter}
              onValueChange={(value) => setRoommateFilter(value as RoommateFilter)}
            >
              <SelectTrigger id="roommate-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roommateOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Categories</Label>
            <div className="flex flex-wrap gap-2">
              {allTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No overlays available yet.</p>
              ) : (
                allTypes.map((type) => {
                  const isActive = activeTypes.has(type)
                  return (
                    <Button
                      key={type}
                      type="button"
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleType(type)}
                    >
                      {annotationTypeLabels[type]}
                    </Button>
                  )
                })
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {filteredFloorplans.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No floorplans available</CardTitle>
            <CardDescription>Once your property manager uploads floorplans, they will appear here.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        filteredFloorplans.map((floorplan) => (
          <Card key={floorplan.id}>
            <CardHeader>
              <CardTitle>{floorplan.name}</CardTitle>
              <CardDescription>
                {floorplan.building.name ?? "Unnamed building"}
                {floorplan.unit ? ` • Unit ${floorplan.unit.unitNumber ?? ""}` : " • Building wide"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative overflow-hidden rounded-lg border">
                {floorplan.signedUrl ? (
                  <Image
                    src={floorplan.signedUrl}
                    alt={`${floorplan.name} preview`}
                    width={1600}
                    height={1200}
                    className="h-auto w-full object-contain"
                    sizes="(min-width: 768px) 420px, 100vw"
                  />
                ) : (
                  <div className="flex h-64 items-center justify-center bg-muted">
                    <p className="text-sm text-muted-foreground">No preview available</p>
                  </div>
                )}

                {floorplan.annotations.map((annotation) => {
                  if (!annotation.geometry || annotation.geometry.type !== "rect") {
                    return null
                  }

                  const { x, y, width, height } = annotation.geometry
                  const color = annotationColors[annotation.annotationType]

                  return (
                    <div
                      key={annotation.id}
                      className="absolute rounded border-2"
                      style={{
                        left: `${x * 100}%`,
                        top: `${y * 100}%`,
                        width: `${width * 100}%`,
                        height: `${height * 100}%`,
                        borderColor: color,
                        backgroundColor: `${color}22`,
                      }}
                    >
                      <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 text-xs text-white">
                        {annotation.label}
                      </span>
                    </div>
                  )
                })}
              </div>

              <div className="space-y-3">
                {floorplan.annotations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No overlays match your filters.</p>
                ) : (
                  floorplan.annotations.map((annotation) => (
                    <div key={annotation.id} className="rounded border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{annotationTypeLabels[annotation.annotationType]}</Badge>
                            <span className="font-medium">{annotation.label}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {annotation.assigneeName ?? "Shared by everyone"}
                          </p>
                        </div>
                        {annotation.metadata && Object.keys(annotation.metadata).length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {Object.entries(annotation.metadata).map(([key, value]) => (
                              <div key={key}>
                                <span className="font-medium">{key}:</span> {String(value)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </section>
  )
}
