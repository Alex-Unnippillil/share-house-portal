// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockLoginWithEmailAndPassword = vi.fn()
const mockRequestPasswordReset = vi.fn()
const mockSignInWithWorkOS = vi.fn()
const mockSignUpWithEmailAndPassword = vi.fn()
const mockUpdatePassword = vi.fn()
const mockToast = vi.fn()

vi.mock("@/app/auth/actions", () => ({
  loginWithEmailAndPassword: (...args: unknown[]) => mockLoginWithEmailAndPassword(...args),
  requestPasswordReset: (...args: unknown[]) => mockRequestPasswordReset(...args),
  signInWithWorkOS: (...args: unknown[]) => mockSignInWithWorkOS(...args),
  signUpWithEmailAndPassword: (...args: unknown[]) => mockSignUpWithEmailAndPassword(...args),
  updatePassword: (...args: unknown[]) => mockUpdatePassword(...args),
}))

vi.mock("@/components/ui/use-toast", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}))

import AuthForm from "@/app/auth/components/AuthForm"

describe("AuthForm mobile layout", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 320,
      writable: true,
    })

    mockLoginWithEmailAndPassword.mockResolvedValue(JSON.stringify({ error: null }))
    mockRequestPasswordReset.mockResolvedValue(JSON.stringify({ error: null }))
    mockSignInWithWorkOS.mockResolvedValue(JSON.stringify({ error: null, url: "https://example.com/sso" }))
    mockSignUpWithEmailAndPassword.mockResolvedValue(JSON.stringify({ error: null }))
    mockUpdatePassword.mockResolvedValue(JSON.stringify({ error: null }))
  })

  it("uses responsive width and compact tab trigger spacing", () => {
    const { container } = render(<AuthForm />)

    const root = container.firstElementChild
    expect(root).toHaveClass("w-full")
    expect(root).toHaveClass("max-w-md")
    expect(root).not.toHaveClass("w-96")

    const tablist = screen.getByRole("tablist")
    expect(tablist).toHaveClass("grid-cols-3")
    expect(tablist).toHaveClass("gap-1")

    const loginTab = screen.getByRole("tab", { name: /login/i })
    expect(loginTab).toHaveClass("text-xs")
    expect(loginTab).toHaveClass("sm:text-sm")
  })

  it("keeps form validation and focusable controls accessible on narrow viewports", async () => {
    const user = userEvent.setup()
    render(<AuthForm initialMode="signup" />)

    const signupPanel = screen.getByRole("tabpanel", { name: /sign up/i })
    const accountTypeSelect = within(signupPanel).getByLabelText(/account type/i)
    expect(accountTypeSelect).toHaveClass("focus-visible:ring-2")

    const createAccount = within(signupPanel).getByRole("button", { name: /create account/i })
    await user.click(createAccount)

    await waitFor(() => {
      expect(within(signupPanel).getByText(/full name is required/i)).toBeInTheDocument()
    })
  })

  it("continues to surface toast errors for mobile SSO flows", async () => {
    const user = userEvent.setup()
    mockSignInWithWorkOS.mockResolvedValueOnce(JSON.stringify({ error: "SSO offline", url: null }))

    render(<AuthForm />)

    await user.click(screen.getByRole("button", { name: /continue with sso/i }))

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Unable to start SSO sign in",
          description: "SSO offline",
          variant: "destructive",
        })
      )
    })
  })
})
