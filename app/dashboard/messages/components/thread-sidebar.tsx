"use client"

import { FormEvent, useMemo, useState } from "react"
import { MessageCircle, Pin, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

import { useMessagesContext } from "./messages-provider"

const BUILDING_SCOPE_VALUE = "__building__"

export default function ThreadSidebar() {
  const {
    state,
    selectedThreadId,
    selectThread,
    buildings,
    units,
    assignments,
    createThread,
  } = useMessagesContext()

  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("general")
  const [isCreating, setIsCreating] = useState(false)

  const defaultBuilding = assignments[0]?.building_id ?? ""
  const [buildingId, setBuildingId] = useState(defaultBuilding)
  const [unitSelection, setUnitSelection] = useState<string>(
    assignments[0]?.unit_id ?? BUILDING_SCOPE_VALUE,
  )

  const accessibleBuildings = useMemo(() => {
    const unique = new Map<string, string>()
    for (const assignment of assignments) {
      const building = buildings.find((entry) => entry.id === assignment.building_id)
      unique.set(assignment.building_id, building?.name ?? "Building")
    }
    return Array.from(unique.entries())
  }, [assignments, buildings])

  const availableUnits = useMemo(() => {
    return units.filter((unit) => unit.building_id === buildingId)
  }, [units, buildingId])

  const threadOrder = state.threadOrder.map((id) => state.threads[id])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim() || !buildingId) {
      return
    }

    setIsCreating(true)
    try {
      await createThread({
        title: title.trim(),
        buildingId,
        unitId: unitSelection === BUILDING_SCOPE_VALUE ? null : unitSelection,
        category,
      })
      setTitle("")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <Card className="flex-1 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Threads</CardTitle>
          <span className="text-xs text-muted-foreground">{threadOrder.length} active</span>
        </CardHeader>
        <CardContent className="space-y-2 overflow-y-auto">
          {threadOrder.length === 0 ? (
            <p className="text-sm text-muted-foreground">No threads yet. Start a conversation below.</p>
          ) : (
            threadOrder.map((entry) => {
              const { thread } = entry
              const building = buildings.find((b) => b.id === thread.building_id)
              const unit = thread.unit_id
                ? units.find((u) => u.id === thread.unit_id)
                : undefined
              const isSelected = selectedThreadId === thread.id
              return (
                <button
                  type="button"
                  key={thread.id}
                  onClick={() => selectThread(thread.id)}
                  className={cn(
                    "w-full rounded-md border border-transparent p-3 text-left transition hover:border-border hover:bg-muted/60",
                    isSelected && "border-primary bg-primary/10",
                  )}
                >
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span className="line-clamp-1 flex items-center gap-1">
                      <MessageCircle className="size-4 shrink-0 text-muted-foreground" />
                      {thread.title}
                    </span>
                    {thread.pinned_message_id ? (
                      <Pin className="size-3.5 text-primary" aria-hidden="true" />
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {building?.name ?? "Building"}
                    {unit ? ` • ${unit.label}` : " • Common"}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {entry.messageOrder.length} message{entry.messageOrder.length === 1 ? "" : "s"}
                  </div>
                </button>
              )
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Plus className="size-4" /> Start a thread
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Topic</label>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Appliance repair, rent reminder..."
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Building</label>
              <Select
                value={buildingId}
                onValueChange={(value) => {
                  setBuildingId(value)
                  const firstUnit = assignments.find(
                    (assignment) => assignment.building_id === value,
                  )?.unit_id
                  setUnitSelection(firstUnit ?? BUILDING_SCOPE_VALUE)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select building" />
                </SelectTrigger>
                <SelectContent>
                  {accessibleBuildings.map(([id, name]) => (
                    <SelectItem key={id} value={id}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Scope</label>
              <Select value={unitSelection} onValueChange={setUnitSelection}>
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={BUILDING_SCOPE_VALUE}>Whole building</SelectItem>
                  {availableUnits.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="announcement">Announcement</SelectItem>
                  <SelectItem value="poll">Poll</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={isCreating || !title.trim()}>
              {isCreating ? "Creating..." : "Create thread"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
