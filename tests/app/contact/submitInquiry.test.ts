import { describe, it, expect, beforeEach, vi } from "vitest"
import { submitInquiry } from "@/app/contact/actions"
import { createSignedCsrfCookieValue, CSRF_COOKIE_NAME } from "@/utils/csrf"
import { createClient } from "@/utils/supa-server-actions"

const cookieStore = {
  get: vi.fn(),
  set: vi.fn(),
}

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => cookieStore),
}))

const insertMock = vi.fn()
const fromMock = vi.fn(() => ({ insert: insertMock }))

vi.mock("@/utils/supa-server-actions", () => ({
  createClient: vi.fn(() => ({
    from: fromMock,
  })),
}))

describe("submitInquiry CSRF protection", () => {
  beforeEach(() => {
    process.env.CSRF_SECRET = "test-secret"
    cookieStore.get.mockReset()
    cookieStore.set.mockReset()
    fromMock.mockClear()
    insertMock.mockReset()
    vi.mocked(createClient).mockClear()
  })

  it("rejects submissions without a CSRF token", async () => {
    cookieStore.get.mockReturnValue(undefined)

    const result = await submitInquiry({
      name: "Test User",
      email: "test@example.com",
      message: "Hello",
      csrfToken: "",
    })

    expect(result).toEqual({
      success: false,
      message: "Invalid CSRF token.",
      status: 403,
    })
    expect(createClient).not.toHaveBeenCalled()
    expect(fromMock).not.toHaveBeenCalled()
  })

  it("rejects submissions with mismatched CSRF tokens", async () => {
    const validToken = "valid-token"
    const cookieValue = createSignedCsrfCookieValue(validToken)

    cookieStore.get.mockImplementation((name: string) => {
      if (name === CSRF_COOKIE_NAME) {
        return { name, value: cookieValue }
      }
      return undefined
    })

    const result = await submitInquiry({
      name: "Test User",
      email: "test@example.com",
      message: "Hello",
      csrfToken: "tampered-token",
    })

    expect(result).toEqual({
      success: false,
      message: "Invalid CSRF token.",
      status: 403,
    })
    expect(createClient).not.toHaveBeenCalled()
    expect(fromMock).not.toHaveBeenCalled()
  })
})
