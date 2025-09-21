import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import FloorplanViewer from "../floorplan-viewer"
import type { ResidentFloorplanWithRelations } from "@/types/floorplans"

const buildAssignment = (): ResidentFloorplanWithRelations => ({
  id: "assignment-1",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
  floorplan_id: "floorplan-1",
  resident_id: "resident-1",
  effective_start: "2024-01-01",
  effective_end: null,
  is_primary: true,
  floorplan: {
    id: "floorplan-1",
    name: "Unit 4A",
    description: "Primary test floorplan",
    unit_label: "4A",
    base_image_bucket: "floorplans",
    base_image_path: "floorplan-1/base.png",
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    metadata: null,
    is_active: true,
    overlays: [
      {
        id: "overlay-1",
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-01T00:00:00.000Z",
        floorplan_id: "floorplan-1",
        name: "Bedroom A",
        overlay_type: "room",
        geometry: {
          type: "rect",
          x: 10,
          y: 20,
          width: 100,
          height: 80,
        },
        metadata: {
          amenities: ["Closet"],
          notes: "North facing",
          fillColor: "#2563eb",
        },
        is_interactive: true,
        occupant_profile_id: "resident-1",
        display_order: 0,
        occupant: {
          id: "resident-1",
          full_name: "Alex Tenant",
          email: "alex@example.com",
        },
      },
      {
        id: "overlay-2",
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-01T00:00:00.000Z",
        floorplan_id: "floorplan-1",
        name: "Washer/Dryer",
        overlay_type: "amenity",
        geometry: {
          type: "rect",
          x: 150,
          y: 80,
          width: 40,
          height: 30,
        },
        metadata: {
          amenities: ["Laundry"],
        },
        is_interactive: true,
        occupant_profile_id: null,
        display_order: 1,
        occupant: null,
      },
    ],
  },
})

describe("FloorplanViewer", () => {
  it("renders overlays and displays details when selected", () => {
    render(
      <FloorplanViewer
        assignment={buildAssignment()}
        imageUrl="https://example.com/floorplan.png"
        isEditable={false}
      />
    )

    const image = screen.getByRole("img", { name: /unit 4a/i }) as HTMLImageElement
    Object.defineProperty(image, "naturalWidth", { configurable: true, value: 600 })
    Object.defineProperty(image, "naturalHeight", { configurable: true, value: 400 })
    fireEvent.load(image)

    const overlay = screen.getByRole("button", { name: /bedroom a/i })
    fireEvent.click(overlay)

    const detailsPanel = screen.getByTestId("overlay-details")
    expect(within(detailsPanel).getByText(/assigned to alex tenant/i)).toBeInTheDocument()
    expect(within(detailsPanel).getByText(/closet/i)).toBeInTheDocument()
    expect(within(detailsPanel).getByText(/north facing/i)).toBeInTheDocument()
  })

  it("allows toggling overlay visibility by type", () => {
    render(
      <FloorplanViewer
        assignment={buildAssignment()}
        imageUrl="https://example.com/floorplan.png"
        isEditable={false}
      />
    )

    const amenityToggle = screen.getByRole("button", { name: /amenity/i })
    fireEvent.click(amenityToggle)

    expect(screen.queryByRole("button", { name: /washer\/dryer/i })).not.toBeInTheDocument()
  })

  it("shows a placeholder when no image is provided", () => {
    render(
      <FloorplanViewer assignment={buildAssignment()} imageUrl={null} isEditable={false} />
    )

    expect(
      screen.getByText(/no base floorplan image is available for this assignment yet/i)
    ).toBeInTheDocument()
  })
})
