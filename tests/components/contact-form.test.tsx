import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/app/contact/actions", () => ({
  submitInquiry: vi.fn(),
}))

vi.mock("@/components/ui/use-toast", () => ({
  toast: vi.fn(),
}))

import { submitInquiry } from "@/app/contact/actions"
import { Contact } from "@/components/forms/contact"
import { toast } from "@/components/ui/use-toast"

describe("Contact form", () => {
  const submitInquiryMock = vi.mocked(submitInquiry)
  const toastMock = vi.mocked(toast)

  beforeEach(() => {
    submitInquiryMock.mockResolvedValue({
      success: true,
      message: "ok",
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("surfaces validation errors with accessible messaging", async () => {
    render(<Contact />)

    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: /send message/i }))

    expect(await screen.findByText("Name can not be empty")).toBeVisible()
    expect(screen.getByText("Please provide a valid email address.")).toBeVisible()
    expect(await screen.findByText("Message can not be empty")).toBeVisible()

    const [nameInput] = screen.getAllByLabelText("Name")
    const [emailInput] = screen.getAllByLabelText("Email")
    const [messageInput] = screen.getAllByLabelText("Message")

    expect(nameInput).toHaveAttribute("aria-invalid", "true")
    expect(emailInput).toHaveAttribute("aria-invalid", "true")
    expect(messageInput).toHaveAttribute("aria-invalid", "true")

    expect(nameInput.getAttribute("aria-describedby")).toMatch(/form-item-message/)
    expect(emailInput.getAttribute("aria-describedby")).toMatch(/form-item-message/)
    expect(messageInput.getAttribute("aria-describedby")).toMatch(/form-item-message/)

    expect(submitInquiryMock).not.toHaveBeenCalled()
    expect(toastMock).not.toHaveBeenCalled()
  })

  it("renders server errors inside the message field", async () => {
    submitInquiryMock.mockResolvedValueOnce({
      success: false,
      message: "Server error. Please try again.",
    })

    render(<Contact />)

    const user = userEvent.setup()
    const [nameInput] = screen.getAllByLabelText("Name")
    const [emailInput] = screen.getAllByLabelText("Email")
    const [messageInput] = screen.getAllByLabelText("Message")

    await user.type(nameInput, "Ada Lovelace")
    await user.type(emailInput, "ada@example.com")
    await user.type(messageInput, "Hello there!")
    await user.click(screen.getAllByRole("button", { name: /send message/i })[0])

    expect(
      await screen.findByText("Server error. Please try again."),
    ).toBeVisible()
    expect(messageInput).toHaveAttribute("aria-invalid", "true")
    expect(messageInput.getAttribute("aria-describedby")).toMatch(
      /form-item-message/,
    )

    expect(toastMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ variant: "destructive" }),
    )
  })
})
