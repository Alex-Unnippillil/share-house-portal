// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import AboutPage from "@/app/about/page"

vi.mock("@/components/forms/contact", () => ({
  Contact: () => <div>Contact form placeholder</div>,
}))

describe("/about route", () => {
  it("renders tenant-facing help content and excludes marketing-only sections", () => {
    render(<AboutPage />)

    expect(screen.getByRole("heading", { name: "Portal Help" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "How it works" })).toBeInTheDocument()
    expect(screen.getByText(/Complete onboarding/i)).toBeInTheDocument()

    expect(screen.queryByText("About Our Company")).not.toBeInTheDocument()
    expect(screen.queryByText("Our Team")).not.toBeInTheDocument()
    expect(screen.queryByText("Our Values")).not.toBeInTheDocument()
  })
})
