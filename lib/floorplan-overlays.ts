export type FloorplanOverlayCategory = "amenity" | "parking" | "roommate"

export interface FloorplanOverlayTarget {
  id: string
  label: string
  shortLabel: string
  tooltip: string
  ariaLabel: string
  route: string
  className: string
  type: FloorplanOverlayCategory
  isExternal?: boolean
}

const rawParkingBase = process.env.NEXT_PUBLIC_CALCOM_PARKING_URL?.trim()
const parkingBase = rawParkingBase && rawParkingBase.length > 0 ? rawParkingBase.replace(/\/$/, "") : "https://cal.com/share-house/parking"

const buildParkingUrl = (slot: string) => {
  const separator = parkingBase.includes("?") ? "&" : "?"
  return `${parkingBase}${separator}slot=${encodeURIComponent(slot)}`
}

export const floorplanOverlays: FloorplanOverlayTarget[] = [
  {
    id: "amenity-kitchen",
    label: "Kitchen amenity",
    shortLabel: "Kitchen",
    tooltip: "Reserve stove time or review appliance guidance before meal prep.",
    ariaLabel: "Open kitchen amenity booking details",
    route: "/bookings?amenity=kitchen",
    className: "col-span-2 col-start-1 row-span-2 row-start-1",
    type: "amenity",
  },
  {
    id: "amenity-lounge",
    label: "TV lounge",
    shortLabel: "Lounge",
    tooltip: "See the shared TV lounge calendar and quiet-hour rules.",
    ariaLabel: "Open TV lounge amenity booking details",
    route: "/bookings?amenity=lounge",
    className: "col-span-2 col-start-3 row-span-2 row-start-1",
    type: "amenity",
  },
  {
    id: "parking-a",
    label: "Parking bay A",
    shortLabel: "Parking A",
    tooltip: "Launch Cal.com to reserve parking bay A before driving home.",
    ariaLabel: "Open parking bay A booking scheduler on Cal.com",
    route: buildParkingUrl("A"),
    className: "col-span-2 col-start-5 row-span-1 row-start-1",
    type: "parking",
    isExternal: true,
  },
  {
    id: "parking-b",
    label: "Parking bay B",
    shortLabel: "Parking B",
    tooltip: "Launch Cal.com to reserve parking bay B before driving home.",
    ariaLabel: "Open parking bay B booking scheduler on Cal.com",
    route: buildParkingUrl("B"),
    className: "col-span-2 col-start-5 row-span-1 row-start-2",
    type: "parking",
    isExternal: true,
  },
  {
    id: "roommate-aria",
    label: "Aria Chen — Bedroom 1",
    shortLabel: "Aria",
    tooltip: "View Aria's roommate profile, storage assignments, and contact info.",
    ariaLabel: "Open roommate profile for Aria Chen",
    route: "/dashboard/members?member=aria-chen",
    className: "col-span-3 col-start-1 row-span-2 row-start-3",
    type: "roommate",
  },
  {
    id: "roommate-jamal",
    label: "Jamal Rivera — Bedroom 2",
    shortLabel: "Jamal",
    tooltip: "Review Jamal's roommate profile, chores, and communication preferences.",
    ariaLabel: "Open roommate profile for Jamal Rivera",
    route: "/dashboard/members?member=jamal-rivera",
    className: "col-span-3 col-start-4 row-span-2 row-start-3",
    type: "roommate",
  },
]

const overlayIndex = new Map(floorplanOverlays.map((overlay) => [overlay.id, overlay]))

export const getOverlayById = (id: string) => overlayIndex.get(id)

export interface OverlayNavigator {
  push: (href: string) => void
  prefetch?: (href: string) => Promise<void>
}

export type ExternalOpener = (href: string) => void

export const navigateToOverlay = (
  overlay: FloorplanOverlayTarget,
  router: OverlayNavigator,
  openExternal: ExternalOpener,
) => {
  if (overlay.isExternal) {
    openExternal(overlay.route)
    return
  }

  router.push(overlay.route)
}
