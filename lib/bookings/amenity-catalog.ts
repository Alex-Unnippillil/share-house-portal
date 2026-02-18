import { Car, Gamepad2, Monitor, Tv, UtensilsCrossed } from "lucide-react"

export type AmenityKind = "kitchen" | "tv-room" | "playstation" | "parking" | "computer"

export interface AmenityCatalogItem {
  id: string
  amenityType: AmenityKind
  propertyId: string
  propertyName: string
  amenityName: string
  amenityDescription: string
  iconName: "UtensilsCrossed" | "Tv" | "Gamepad2" | "Car" | "Monitor"
  durationMinutes: number
  maxAdvanceDays: number
  maxRecurringOccurrences: number
  maxConsecutiveDays: number
  cancellationWindowHours: number
  calEventTypeSlug: string
  calUsername: string
}

export const AMENITY_ICON_MAP = {
  UtensilsCrossed,
  Tv,
  Gamepad2,
  Car,
  Monitor,
} as const

export const amenityCatalog: AmenityCatalogItem[] = [
  {
    id: "shoreline-kitchen",
    amenityType: "kitchen",
    propertyId: "shoreline-house",
    propertyName: "Shoreline House",
    amenityName: "Kitchen",
    amenityDescription: "Meal prep, batch cooking, and shared dinner slots",
    iconName: "UtensilsCrossed",
    durationMinutes: 120,
    maxAdvanceDays: 7,
    maxRecurringOccurrences: 8,
    maxConsecutiveDays: 3,
    cancellationWindowHours: 2,
    calEventTypeSlug: "shoreline-kitchen",
    calUsername: "shoreline-team",
  },
  {
    id: "shoreline-tv-room",
    amenityType: "tv-room",
    propertyId: "shoreline-house",
    propertyName: "Shoreline House",
    amenityName: "TV Room",
    amenityDescription: "Movies, watch parties, and gaming sessions",
    iconName: "Tv",
    durationMinutes: 180,
    maxAdvanceDays: 10,
    maxRecurringOccurrences: 8,
    maxConsecutiveDays: 2,
    cancellationWindowHours: 4,
    calEventTypeSlug: "shoreline-tv-room",
    calUsername: "shoreline-team",
  },
  {
    id: "shoreline-playstation",
    amenityType: "playstation",
    propertyId: "shoreline-house",
    propertyName: "Shoreline House",
    amenityName: "PlayStation Nook",
    amenityDescription: "Console gaming and tournaments",
    iconName: "Gamepad2",
    durationMinutes: 120,
    maxAdvanceDays: 7,
    maxRecurringOccurrences: 6,
    maxConsecutiveDays: 2,
    cancellationWindowHours: 1,
    calEventTypeSlug: "shoreline-playstation",
    calUsername: "shoreline-team",
  },
  {
    id: "shoreline-parking",
    amenityType: "parking",
    propertyId: "shoreline-house",
    propertyName: "Shoreline House",
    amenityName: "Parking Spot",
    amenityDescription: "Visitor and short-term overnight parking",
    iconName: "Car",
    durationMinutes: 720,
    maxAdvanceDays: 21,
    maxRecurringOccurrences: 4,
    maxConsecutiveDays: 5,
    cancellationWindowHours: 8,
    calEventTypeSlug: "shoreline-parking",
    calUsername: "shoreline-team",
  },
  {
    id: "shoreline-computer",
    amenityType: "computer",
    propertyId: "shoreline-house",
    propertyName: "Shoreline House",
    amenityName: "Shared Computer",
    amenityDescription: "Remote work, studying, and printing",
    iconName: "Monitor",
    durationMinutes: 90,
    maxAdvanceDays: 5,
    maxRecurringOccurrences: 10,
    maxConsecutiveDays: 4,
    cancellationWindowHours: 1,
    calEventTypeSlug: "shoreline-computer",
    calUsername: "shoreline-team",
  },
]

export function groupAmenitiesByProperty() {
  return amenityCatalog.reduce<Record<string, AmenityCatalogItem[]>>((acc, amenity) => {
    acc[amenity.propertyName] = acc[amenity.propertyName] || []
    acc[amenity.propertyName].push(amenity)
    return acc
  }, {})
}

export function buildCalEmbedUrl(item: AmenityCatalogItem) {
  const baseUrl = process.env.NEXT_PUBLIC_CALCOM_BASE_URL || process.env.CALCOM_BASE_URL || "https://cal.com"
  const url = new URL(`/${item.calUsername}/${item.calEventTypeSlug}`, baseUrl)
  url.searchParams.set("embed", "1")
  url.searchParams.set("theme", "light")
  url.searchParams.set("hideEventTypeDetails", "false")
  return url.toString()
}
