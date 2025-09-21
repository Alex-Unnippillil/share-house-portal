import type { Metadata } from "next"

import AmenitiesFeatureExperience from "./_components/amenities-feature-experience"

export const metadata: Metadata = {
  title: "Amenities reservations | Share House Portal",
  description:
    "Interactive amenity scheduling demo showcasing quotas, blackout periods, approvals, and ICS exports.",
}

export default function AmenitiesFeaturePage() {
  return <AmenitiesFeatureExperience />
}
