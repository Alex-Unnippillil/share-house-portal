"use client"

import { useMemo, useState } from "react"
import { Compass, Map, Sparkles } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

type FloorCell = {
  id: string
  label: string
  description: string
  className: string
}

type TenantMap = {
  id: string
  name: string
  role: string
  focus: string
  highlights: string[]
  responsibilities: string[]
  accent: string
}

const floorCells: FloorCell[] = [
  { id: "entry", label: "Entry", description: "Lockers & shoe storage", className: "col-span-1" },
  { id: "living", label: "Living room", description: "Projector + modular seating", className: "col-span-2 row-span-2" },
  { id: "workspace-a", label: "Workspace A", description: "Standing desk + monitor", className: "col-span-1" },
  { id: "kitchen", label: "Kitchen", description: "Island, pantry, shared fridge", className: "col-span-2 row-span-2" },
  { id: "workspace-b", label: "Workspace B", description: "Focus nook with acoustic panels", className: "col-span-1" },
  { id: "studio", label: "Wellness studio", description: "Yoga, pilates, meditation", className: "col-span-1" },
  { id: "laundry", label: "Laundry", description: "Washers, folding table", className: "col-span-1" },
  { id: "bath", label: "Shared bath", description: "Double sinks + storage", className: "col-span-1" },
  { id: "deck", label: "Roof deck", description: "Planters + communal table", className: "col-span-2" },
  { id: "loft", label: "Loft suite", description: "Private sleeping area", className: "col-span-2 row-span-2" },
]

const tenantMaps: TenantMap[] = [
  {
    id: "taylor",
    name: "Taylor Johnson",
    role: "Loft suite · Desk A",
    focus: "Early riser · coordinates pantry restocks",
    highlights: ["loft", "workspace-a", "kitchen", "deck"],
    responsibilities: [
      "Rotates groceries and monitors pantry labels each Monday.",
      "Hosts monthly house meetings from the living room projector.",
    ],
    accent: "ring-emerald-400 bg-emerald-500/10",
  },
  {
    id: "amanda",
    name: "Amanda Lee",
    role: "Corner bedroom · Workspace B",
    focus: "Night owl · wellness studio lead",
    highlights: ["workspace-b", "studio", "bath", "living"],
    responsibilities: [
      "Maintains yoga props and refreshes diffuser oils weekly.",
      "Closes down the shared spaces after evening quiet hours.",
    ],
    accent: "ring-indigo-400 bg-indigo-500/10",
  },
  {
    id: "marco",
    name: "Marco Alvarez",
    role: "Garden suite · Kitchen steward",
    focus: "Weekend chef · manages compost pickup",
    highlights: ["kitchen", "living", "laundry", "deck"],
    responsibilities: [
      "Schedules amenity deep cleans and coordinates vendor visits.",
      "Oversees the rotating laundry schedule and keeps detergent stocked.",
    ],
    accent: "ring-amber-400 bg-amber-500/10",
  },
]

export function SharedSpaceDiagram() {
  const [tenantId, setTenantId] = useState(tenantMaps[0].id)
  const tenant = useMemo(() => tenantMaps.find((item) => item.id === tenantId) ?? tenantMaps[0], [tenantId])
  const highlightedAreas = useMemo(() => new Set(tenant.highlights), [tenant.highlights])

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Map className="h-5 w-5 text-primary" aria-hidden="true" />
              Shared space map
            </CardTitle>
            <CardDescription>
              Visualise how shared rooms are distributed for each tenant and see responsibilities at a glance.
            </CardDescription>
          </div>
          <Select value={tenantId} onValueChange={setTenantId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select a tenant" />
            </SelectTrigger>
            <SelectContent>
              {tenantMaps.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid auto-rows-[100px] grid-cols-4 gap-3">
          {floorCells.map((cell) => {
            const isHighlighted = highlightedAreas.has(cell.id)
            return (
              <div
                key={cell.id}
                className={cn(
                  "relative flex flex-col justify-between rounded-lg border bg-muted/40 p-3 text-xs transition hover:border-primary/60",
                  cell.className,
                  isHighlighted ? `ring-2 ${tenant.accent} ring-offset-2 ring-offset-background` : ""
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{cell.label}</p>
                  {isHighlighted ? (
                    <Badge variant="outline" className="text-[10px] uppercase">
                      In use
                    </Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">{cell.description}</p>
              </div>
            )
          })}
        </div>
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">{tenant.name}</p>
              <p className="text-sm text-muted-foreground">{tenant.role}</p>
              <Badge variant="secondary" className="flex w-fit items-center gap-1">
                <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                {tenant.focus}
              </Badge>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Shared responsibilities</p>
              <ul className="list-disc space-y-1 pl-4">
                {tenant.responsibilities.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
          <Separator className="my-4" />
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Highlighted rooms show where this tenant stores personal items or leads upkeep duties.
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-xs text-muted-foreground">
        <p>
          Looking for another layout? Upload updated floor plans in the management dashboard and they will sync here automatically.
        </p>
      </CardFooter>
    </Card>
  )
}
