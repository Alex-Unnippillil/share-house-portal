// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import OnboardingProgress from "@/components/onboarding-progress"

vi.mock("next/navigation", () => ({
  usePathname: () => "/onboarding",
  useSearchParams: () => new URLSearchParams("step=3"),
}))

vi.mock("@/components/navigation/SmartLink", () => ({
  default: ({ href, className, children, ...props }: { href: string; className?: string; children: string }) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}))

describe("OnboardingProgress", () => {
  it("highlights current onboarding step based on route query", () => {
    render(<OnboardingProgress />)

    const currentStep = screen.getByRole("link", { name: /3rent/i })
    expect(currentStep).toHaveAttribute("aria-current", "step")
    expect(currentStep).toHaveClass("border-primary")
  })

  it("creates onboarding step links tied to /onboarding route", () => {
    render(<OnboardingProgress />)

    expect(screen.getByRole("link", { name: /1profile/i })).toHaveAttribute("href", "/onboarding?step=1")
    expect(screen.getByRole("link", { name: /6review/i })).toHaveAttribute("href", "/onboarding?step=6")
  })

  it("marks locked steps as aria-disabled", () => {
    render(
      <OnboardingProgress
        steps={[
          { id: 1, label: "Profile", complete: true },
          { id: 2, label: "Unit", complete: true },
          { id: 3, label: "Rent" },
          { id: 4, label: "Emergency", locked: true },
          { id: 5, label: "Vehicle", locked: true },
          { id: 6, label: "Review", locked: true },
        ]}
      />,
    )

    expect(screen.getByRole("link", { name: /4emergency/i })).toHaveAttribute("aria-disabled", "true")
    expect(screen.getByRole("link", { name: /5vehicle/i })).toHaveAttribute("aria-disabled", "true")
  })
})
