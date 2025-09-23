import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import React from "react"
import type { User } from "@supabase/supabase-js"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { mockUpsert, mockFrom, mockSupabase, useSupabaseBrowserMock } =
  vi.hoisted(() => {
    const mockUpsert = vi.fn()
    const mockFrom = vi.fn()
    const mockSupabase = { from: mockFrom }
    const useSupabaseBrowserMock = vi.fn(() => mockSupabase)

    return { mockUpsert, mockFrom, mockSupabase, useSupabaseBrowserMock }
  })

const { toastMock } = vi.hoisted(() => ({
  toastMock: vi.fn(),
}))

vi.mock("@/utils/supabase-browser", () => ({
  __esModule: true,
  default: useSupabaseBrowserMock,
}))

vi.mock("@/components/ui/use-toast", () => ({
  toast: toastMock,
}))

vi.mock("@/app/account/avatar", () => ({
  __esModule: true,
  default: ({
    onUpload,
  }: {
    uid: string | null
    url: string | null
    size: number
    onUpload: (url: string) => void
  }) => (
    <button type="button" onClick={() => onUpload("avatar.png")}>
      Upload avatar
    </button>
  ),
}))

import AccountForm from "@/app/account/supa-account-form"

const baseUser = {
  id: "user-123",
  email: "resident@example.com",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: "2024-01-01T00:00:00.000Z",
} as unknown as User

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  mockUpsert.mockReset()
  mockUpsert.mockResolvedValue({ error: null })
  mockFrom.mockReset()
  mockFrom.mockImplementation(() => ({ upsert: mockUpsert }))
  useSupabaseBrowserMock.mockReturnValue(mockSupabase)
  toastMock.mockReset()
})

describe("Supabase account form validation", () => {
  it("displays validation errors for invalid input", async () => {
    const user = userEvent.setup()

    render(<AccountForm user={baseUser} profile={null} />)

    const fullNameInput = screen.getByLabelText(/full name/i)
    const usernameInput = screen.getByLabelText(/username/i)
    const websiteInput = screen.getByLabelText(/website/i)
    const submitButton = screen.getByRole("button", { name: /update account/i })

    await user.clear(fullNameInput)
    await user.type(fullNameInput, "J")
    await user.clear(usernameInput)
    await user.type(usernameInput, "x")
    await user.clear(websiteInput)
    await user.type(websiteInput, "not-a-url")
    expect(
      await screen.findByText("Full name must be at least 2 characters."),
    ).toBeTruthy()
    expect(
      await screen.findByText("Username must be at least 2 characters."),
    ).toBeTruthy()
    expect(await screen.findByText("Please enter a valid URL.")).toBeTruthy()
    expect(submitButton).toHaveProperty("disabled", true)
    await user.click(submitButton)
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it("refuses to submit until validation issues are resolved", async () => {
    const user = userEvent.setup()

    render(<AccountForm user={baseUser} profile={null} />)

    const fullNameInput = screen.getByLabelText(/full name/i)
    const usernameInput = screen.getByLabelText(/username/i)
    const websiteInput = screen.getByLabelText(/website/i)
    const submitButton = screen.getByRole("button", { name: /update account/i })

    await user.clear(fullNameInput)
    await user.type(fullNameInput, "J")
    await user.clear(usernameInput)
    await user.type(usernameInput, "x")
    await user.clear(websiteInput)
    await user.type(websiteInput, "not-a-url")

    expect(submitButton).toHaveProperty("disabled", true)
    await user.click(submitButton)
    expect(mockUpsert).not.toHaveBeenCalled()

    await user.clear(fullNameInput)
    await user.type(fullNameInput, "Jordan Blake")
    await user.clear(usernameInput)
    await user.type(usernameInput, "jordy")
    await user.clear(websiteInput)
    await user.type(websiteInput, "https://sharehouse.example")

    await waitFor(() => expect(submitButton).toHaveProperty("disabled", false))
    expect(screen.queryByText("Full name must be at least 2 characters.")).toBeNull()
    await user.click(submitButton)
    await waitFor(() => expect(mockUpsert).toHaveBeenCalledTimes(1))
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: baseUser.id,
        full_name: "Jordan Blake",
        username: "jordy",
        website: "https://sharehouse.example",
        email: baseUser.email,
        avatar_url: null,
      }),
    )
  })
})
