import React from "react"

import { describe, expect, it } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"

import { UserAuthForm } from "@/app/auth/components/user-auth-form"

describe("UserAuthForm accessibility", () => {
  it("announces validation errors for assistive technologies", async () => {
    render(<UserAuthForm />)

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement
    const submitButton = screen.getByRole("button", { name: /sign in/i })

    fireEvent.click(submitButton)

    const emailError = await screen.findByText(/please enter a valid email address\./i)
    const passwordError = await screen.findByText(/password can not be empty/i)

    expect(emailInput.getAttribute("aria-invalid")).toBe("true")
    expect(emailInput.getAttribute("aria-describedby")).toContain(emailError.id)
    expect(emailError.getAttribute("aria-live")).toBe("polite")

    expect(passwordInput.getAttribute("aria-invalid")).toBe("true")
    expect(passwordInput.getAttribute("aria-describedby")).toContain(passwordError.id)
    expect(passwordError.getAttribute("aria-live")).toBe("polite")

    await waitFor(() => {
      expect(document.activeElement).toBe(emailInput)
    })
  })
})
