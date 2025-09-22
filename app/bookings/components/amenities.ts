import { Car, Gamepad2, Monitor, Tv, UtensilsCrossed } from "lucide-react";

export const amenities = [
  {
    id: "kitchen",
    name: "Kitchen",
    description: "Book the kitchen for cooking or meal prep",
    icon: UtensilsCrossed,
    duration: "2 hours",
    maxAdvance: "7 days",
  },
  {
    id: "tv-room",
    name: "TV Room",
    description: "Reserve the living room TV for movies or gaming",
    icon: Tv,
    duration: "3 hours",
    maxAdvance: "7 days",
  },
  {
    id: "playstation",
    name: "PlayStation Nook",
    description: "Book the gaming area for console gaming",
    icon: Gamepad2,
    duration: "2 hours",
    maxAdvance: "7 days",
  },
  {
    id: "parking",
    name: "Parking Spot",
    description: "Reserve a visitor parking spot",
    icon: Car,
    duration: "24 hours",
    maxAdvance: "14 days",
  },
  {
    id: "computer",
    name: "Shared Computer",
    description: "Use the shared computer workstation",
    icon: Monitor,
    duration: "1 hour",
    maxAdvance: "3 days",
  },
] as const;

type Amenity = (typeof amenities)[number];

export function getAmenityById(id: string) {
  return amenities.find((amenity) => amenity.id === id);
}

export type AmenityId = Amenity["id"]; 
