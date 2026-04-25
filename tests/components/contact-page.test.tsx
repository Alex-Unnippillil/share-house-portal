// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/components/navigation/SmartLink", () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

vi.mock("@/components/forms/contact", () => ({
  Contact: () => <div data-testid="contact-form">Contact form</div>,
}))

vi.mock("@/components/icons", () => ({
  Icons: {
    logo: ({ className }: { className?: string }) => <svg aria-hidden="true" className={className} />,
  },
}))

vi.mock("@/config/site", () => ({
  siteConfig: {
    name: "Roomsily",
    support: {
      email: "configured-support@roomsily.test",
      phone: "+1-222-333-4444",
    },
  },
}))

import ContactPage from "@/app/contact/page"

describe("contact page support metadata", () => {
  it("renders configured support contact details and removes legacy hardcoded copy", () => {
    render(<ContactPage />)

    expect(screen.getByText("configured-support@roomsily.test")).toBeInTheDocument()
    expect(screen.getByText("+1-222-333-4444")).toBeInTheDocument()
    expect(screen.queryByText("alex@myunni.com")).not.toBeInTheDocument()
    expect(screen.queryByText("+1-416-706-3586")).not.toBeInTheDocument()
  })
})
