// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

import { OnboardingClient } from "@/app/onboarding/onboarding-client"
import { ProfileForm } from "@/components/forms/profile-form"

vi.mock("@/components/navigation/SmartLink", () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

vi.mock("@/app/onboarding/actions", () => ({
  saveEmergencyContact: vi.fn(async () => ({ ok: true, message: "saved" })),
  saveRentShare: vi.fn(async () => ({ ok: true, message: "saved" })),
  saveUnitAssignment: vi.fn(async () => ({ ok: true, message: "saved" })),
  saveVehicleDetails: vi.fn(async () => ({ ok: true, message: "saved" })),
  uploadOnboardingAsset: vi.fn(async () => ({ ok: true, message: "saved" })),
}))

describe("copy microcopy compliance", () => {
  it("uses shared-house onboarding policy copy", () => {
    render(
      <OnboardingClient
        initialData={{
          user: { id: "user-1", email: "tenant@example.com" },
          profile: {
            unitId: "B-402",
            rentShare: 25,
            avatarSignedUrl: null,
            emergencyContact: {},
            vehicleDetails: {},
            completion: { completionPercent: 60, completedSteps: ["unit_assignment"], isComplete: false },
            personalDocuments: [],
          },
        }}
      />,
    )

    expect(
      screen.getByText(
        "Complete each section so tenants, roommates, and property managers can coordinate payments, visitor requests, maintenance access, and emergency response.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByText("Profile photo & resident documents")).toBeInTheDocument()
    expect(screen.getByText("Upload resident document")).toBeInTheDocument()
    expect(screen.getByText(/overnight visitor limits/)).toBeInTheDocument()
  })

  it("replaces legacy website/blog/social copy in profile details", () => {
    render(<ProfileForm />)

    expect(screen.getAllByText("Household details").length).toBeGreaterThan(0)
    expect(
      screen.getAllByText("Add emergency contact, vehicle, or communication preference details for roommates and property managers.")[0],
    ).toBeInTheDocument()
    expect(screen.queryByText("Add links to your website, blog, or social media profiles.")).not.toBeInTheDocument()
  })
})
