// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import OnboardingProgress from "@/components/onboarding-progress"

vi.mock("@/components/navigation/SmartLink", () => ({
  default: ({ href, className, children }: { href: string; className?: string; children: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

describe("OnboardingProgress", () => {
  it("highlights completed and active steps", () => {
    render(<OnboardingProgress step={3} />)

    const step1 = screen.getByRole("link", { name: "1" })
    const step2 = screen.getByRole("link", { name: "2" })
    const step3 = screen.getByRole("link", { name: "3" })
    const step4 = screen.getByRole("link", { name: "4" })

    expect(step1).toHaveClass("bg-slate-800")
    expect(step2).toHaveClass("bg-slate-800")
    expect(step3).toHaveClass("bg-slate-800")
    expect(step4).toHaveClass("bg-slate-100")
  })

  it("keeps all onboarding links accessible", () => {
    render(<OnboardingProgress step={1} />)

    expect(screen.getByRole("link", { name: "1" })).toHaveAttribute(
      "href",
      "/signup?=page1"
    )
    expect(screen.getByRole("link", { name: "2" })).toHaveAttribute(
      "href",
      "/signup?=page2"
    )
    expect(screen.getByRole("link", { name: "3" })).toHaveAttribute(
      "href",
      "/signup?=page3"
    )
    expect(screen.getByRole("link", { name: "4" })).toHaveAttribute(
      "href",
      "/signup?=page4"
    )
  })
})
