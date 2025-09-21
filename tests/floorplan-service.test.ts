import { describe, expect, it, vi } from "vitest"

import { createAnnotation, deleteAnnotation, updateAnnotation } from "@/lib/floorplans/service"
import type { FloorplanAccessContext } from "@/lib/floorplans/access"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

const context: FloorplanAccessContext = {
  userId: "manager-1",
  role: "property_manager",
  managedBuildingIds: ["building-1"],
  unitIds: [],
}

const floorplan = {
  id: "floorplan-1",
  buildingId: "building-1",
  unitId: "unit-1",
}

describe("floorplan annotation service", () => {
  it("creates annotations via supabase", async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: "annotation-1" }, error: null })
    const select = vi.fn().mockReturnValue({ single })
    const insert = vi.fn().mockReturnValue({ select })
    const from = vi.fn().mockReturnValue({ insert })

    const client = { from } as unknown as TypedSupabaseClient

    const record = await createAnnotation(client, context, floorplan, {
      label: "Pantry",
      annotationType: "storage",
      geometry: { x: 10, y: 20 },
      color: "#ff0000",
      notes: "Shared shelves",
      assignedProfileId: "tenant-1",
    })

    expect(from).toHaveBeenCalledWith("floorplan_annotations")
    expect(insert).toHaveBeenCalled()
    const payload = insert.mock.calls[0][0]
    expect(payload).toMatchObject({
      floorplan_id: floorplan.id,
      label: "Pantry",
      annotation_type: "storage",
      assigned_profile_id: "tenant-1",
      created_by: context.userId,
    })
    expect(payload.geometry).toEqual({ x: 10, y: 20 })
    expect(record).toEqual({ id: "annotation-1" })
  })

  it("throws when a user without access attempts to create annotations", async () => {
    const from = vi.fn()
    const client = { from } as unknown as TypedSupabaseClient
    await expect(
      createAnnotation(client, { ...context, role: "tenant", managedBuildingIds: [] }, floorplan, {
        label: "Pantry",
        annotationType: "storage",
        geometry: { x: 10, y: 20 },
      }),
    ).rejects.toThrowError()
    expect(from).not.toHaveBeenCalled()
  })

  it("updates annotations with sanitized geometry", async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: "annotation-1" }, error: null })
    const select = vi.fn().mockReturnValue({ single })
    const eq = vi.fn().mockReturnValue({ select })
    const update = vi.fn().mockReturnValue({ eq })
    const from = vi.fn().mockReturnValue({ update })
    const client = { from } as unknown as TypedSupabaseClient

    await updateAnnotation(client, context, floorplan, "annotation-1", {
      label: "Pantry",
      annotationType: "storage",
      geometry: { x: 200, y: -40, width: 110, height: 5 },
    })

    expect(update).toHaveBeenCalled()
    const payload = update.mock.calls[0][0]
    expect(payload.geometry).toEqual({ x: 100, y: 0, width: 100, height: 5 })
    expect(payload.updated_at).toBeDefined()
  })

  it("deletes annotations", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const del = vi.fn().mockReturnValue({ eq })
    const from = vi.fn().mockReturnValue({ delete: del })
    const client = { from } as unknown as TypedSupabaseClient

    await deleteAnnotation(client, context, floorplan, "annotation-1")

    expect(from).toHaveBeenCalledWith("floorplan_annotations")
    expect(del).toHaveBeenCalled()
    expect(eq).toHaveBeenCalledWith("id", "annotation-1")
  })
})
