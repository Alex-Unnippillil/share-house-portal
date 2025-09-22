export type AmenityOption = {
  id: string
  label: string
  description?: string
}

export const AMENITY_OPTIONS: AmenityOption[] = [
  { id: 'kitchen', label: 'Kitchen', description: 'Shared cooking space' },
  { id: 'tv_lounge', label: 'TV Lounge', description: 'Living room with shared TV setup' },
  { id: 'gaming_nook', label: 'Gaming Nook', description: 'Console and gaming accessories' },
  { id: 'parking_spot', label: 'Parking Spot', description: 'Reserved vehicle parking' },
  { id: 'study_room', label: 'Study Room', description: 'Quiet workspace for residents' },
]

const AMENITY_LOOKUP = new Map(AMENITY_OPTIONS.map((amenity) => [amenity.id, amenity.label]))

export function getAmenityLabel(id: string) {
  return AMENITY_LOOKUP.get(id) ?? 'Unknown amenity'
}
