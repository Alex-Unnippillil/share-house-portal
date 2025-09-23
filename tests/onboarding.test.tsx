// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act } from "react-dom/test-utils"
import { createRoot } from "react-dom/client"

const {
  createServerClientMock,
  createBrowserClientMock,
  cookiesMock,
  revalidatePathMock,
} = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  createBrowserClientMock: vi.fn(),
  cookiesMock: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), delete: vi.fn() })),
  revalidatePathMock: vi.fn(),
}))

vi.mock("@/utils/supa-server-actions", () => ({
  createClient: (cookieStore: unknown) => createServerClientMock(cookieStore),
}))

vi.mock("@/utils/supabase-browser", () => ({
  createClient: () => createBrowserClientMock(),
}))

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}))

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}))

import ChecklistProgress from "@/components/onboarding/ChecklistProgress"
import { submitUnitAssignment } from "@/app/onboarding/actions"

function createServerSupabaseStub(initialProfile?: Partial<{
  unit_id: string | null
  rent_share: number | null
  metadata: Record<string, unknown> | null
  onboarding_steps: Record<string, boolean> | null
}>) {
  let currentProfile = {
    unit_id: initialProfile?.unit_id ?? null,
    rent_share: initialProfile?.rent_share ?? null,
    metadata: initialProfile?.metadata ?? null,
    onboarding_steps:
      initialProfile?.onboarding_steps ??
      {
        unitAssignment: false,
        rentShare: false,
        emergencyContacts: false,
      },
  }

  const selectResponse = vi.fn(() => ({
    eq: vi.fn(() => ({
      single: vi.fn(async () => ({
        data: { ...currentProfile },
        error: null,
      })),
    })),
  }))

  const updateResponse = vi.fn((payload: Record<string, unknown>) => ({
    eq: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => {
          currentProfile = { ...currentProfile, ...payload }
          return { data: { ...currentProfile }, error: null }
        }),
      })),
    })),
  }))

  const fromFn = vi.fn(() => ({
    select: selectResponse,
    update: updateResponse,
  }))

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      }),
    },
    from: fromFn,
    getProfile: () => currentProfile,
  }
}

function createBrowserSupabaseStub(profile: {
  unit_id: string
  rent_share: number
  metadata: Record<string, unknown>
  onboarding_steps: Record<string, boolean>
}) {
  const selectFn = vi.fn(() => ({
    eq: vi.fn(() => ({
      single: vi.fn(async () => ({ data: profile, error: null })),
    })),
  }))

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      }),
    },
    from: vi.fn(() => ({
      select: selectFn,
    })),
  }
}

beforeEach(() => {
  createServerClientMock.mockReset()
  createBrowserClientMock.mockReset()
  cookiesMock.mockReset()
  revalidatePathMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("onboarding progress actions", () => {
  it("marks unit assignment complete and persists onboarding state", async () => {
    const supabaseStub = createServerSupabaseStub()
    createServerClientMock.mockReturnValue(supabaseStub as any)
    cookiesMock.mockReturnValue({ get: vi.fn(), set: vi.fn(), delete: vi.fn() })

    const formData = new FormData()
    formData.append("unitId", "B2")

    const result = await submitUnitAssignment(formData)

    expect(result.success).toBe(true)
    const updatedProfile = supabaseStub.getProfile()
    expect(updatedProfile.unit_id).toBe("B2")
    expect(updatedProfile.onboarding_steps?.unitAssignment).toBe(true)
    expect(revalidatePathMock).toHaveBeenCalledWith("/onboarding")
  })
})

describe("ChecklistProgress", () => {
  it("renders 100% completion state", async () => {
    const browserStub = createBrowserSupabaseStub({
      unit_id: "A1",
      rent_share: 920,
      metadata: {
        emergencyContacts: [{ name: "Alex Rivera", phone: "555-321-7654" }],
      },
      onboarding_steps: {
        unitAssignment: true,
        rentShare: true,
        emergencyContacts: true,
      },
    })

    createBrowserClientMock.mockReturnValue(browserStub as any)

    const container = document.createElement("div")
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(<ChecklistProgress />)
      await Promise.resolve()
    })

    expect(container.textContent).toContain("All onboarding steps complete")

    root.unmount()
    container.remove()
  })
})
