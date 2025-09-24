// @vitest-environment jsdom

import React from "react"
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest"

import {
  ConsentManagerModal,
  ConsentManagerProvider,
  type ConsentPreferences,
  useConsentManager,
} from "@/components/consent-manager"
import { ConsentAwareScripts } from "@/components/consent-aware-scripts"

const {
  createClientMock,
  supabaseClientStub,
  getUserMock,
  selectMock,
  eqMock,
  maybeSingleMock,
  upsertMock,
  fromMock,
} = vi.hoisted(() => {
  const getUserMock = vi.fn()
  const selectMock = vi.fn()
  const eqMock = vi.fn()
  const maybeSingleMock = vi.fn()
  const upsertMock = vi.fn()
  const fromMock = vi.fn()
  const createClientMock = vi.fn()

  const supabaseClientStub = {
    auth: { getUser: getUserMock },
    from: fromMock,
  }

  fromMock.mockImplementation(() => ({
    select: selectMock,
    eq: eqMock,
    maybeSingle: maybeSingleMock,
    upsert: upsertMock,
  }))

  selectMock.mockImplementation(() => ({ eq: eqMock }))
  eqMock.mockImplementation(() => ({ maybeSingle: maybeSingleMock }))
  maybeSingleMock.mockResolvedValue({ data: null, error: null })
  upsertMock.mockResolvedValue({ data: null, error: null })

  return {
    createClientMock,
    supabaseClientStub,
    getUserMock,
    selectMock,
    eqMock,
    maybeSingleMock,
    upsertMock,
    fromMock,
  }
})

vi.mock("@/utils/supabase-browser", () => ({
  createClient: createClientMock,
}))

vi.mock("@vercel/analytics/react", () => ({
  Analytics: () => <div data-testid="analytics" />,
}))

vi.mock("@vercel/speed-insights/next", () => ({
  SpeedInsights: () => <div data-testid="speed-insights" />,
}))

type ConsentControllerHandle = {
  save: (preferences: ConsentPreferences) => Promise<void>
  isReady: () => boolean
}

const ConsentController = React.forwardRef<ConsentControllerHandle>((_, ref) => {
  const manager = useConsentManager()

  React.useImperativeHandle(ref, () => ({
    save: manager.savePreferences,
    isReady: () => manager.isReady,
  }))

  return <ConsentManagerModal />
})
ConsentController.displayName = "ConsentController"

describe("consent manager", () => {
  beforeEach(() => {
    createClientMock.mockClear()
    createClientMock.mockReturnValue(supabaseClientStub)
    getUserMock.mockResolvedValue({ data: { user: null }, error: null })
    selectMock.mockClear()
    eqMock.mockClear()
    fromMock.mockClear()
    maybeSingleMock.mockClear()
    maybeSingleMock.mockResolvedValue({ data: null, error: null })
    upsertMock.mockClear()
    upsertMock.mockResolvedValue({ data: null, error: null })
    localStorage.clear()
    document.body.innerHTML = ""
    delete (window as Record<string, unknown>).__analyticsExecuted
    delete (window as Record<string, unknown>).__marketingExecuted
  })

  afterEach(() => {
    cleanup()
  })

  it("blocks analytics and marketing scripts until consent is granted", async () => {
    const analyticsScript = document.createElement("script")
    analyticsScript.type = "text/plain"
    analyticsScript.dataset.consentCategory = "analytics"
    analyticsScript.textContent =
      "window.__analyticsExecuted = (window.__analyticsExecuted || 0) + 1"
    document.body.appendChild(analyticsScript)

    const marketingScript = document.createElement("script")
    marketingScript.type = "text/plain"
    marketingScript.dataset.consentCategory = "marketing"
    marketingScript.textContent =
      "window.__marketingExecuted = (window.__marketingExecuted || 0) + 1"
    document.body.appendChild(marketingScript)

    const controllerRef = React.createRef<ConsentControllerHandle>()

    render(
      <ConsentManagerProvider>
        <ConsentController ref={controllerRef} />
        <ConsentAwareScripts />
      </ConsentManagerProvider>,
    )

    await waitFor(() => expect(controllerRef.current).not.toBeNull())
    await waitFor(() => expect(controllerRef.current?.isReady()).toBe(true))

    expect(analyticsScript.dataset.consentLoaded).toBeUndefined()
    expect(marketingScript.dataset.consentLoaded).toBeUndefined()

    await act(async () => {
      await controllerRef.current?.save({
        necessary: true,
        analytics: true,
        marketing: false,
      })
    })

    await waitFor(() =>
      expect(analyticsScript.dataset.consentLoaded).toBe("true"),
    )
    expect(marketingScript.dataset.consentLoaded).toBeUndefined()

    await act(async () => {
      await controllerRef.current?.save({
        necessary: true,
        analytics: true,
        marketing: true,
      })
    })

    await waitFor(() =>
      expect(marketingScript.dataset.consentLoaded).toBe("true"),
    )
  })

  it("persists consent preferences across sessions", async () => {
    const controllerRef = React.createRef<ConsentControllerHandle>()

    const { unmount } = render(
      <ConsentManagerProvider>
        <ConsentController ref={controllerRef} />
        <ConsentAwareScripts />
      </ConsentManagerProvider>,
    )

    await waitFor(() => expect(controllerRef.current).not.toBeNull())
    await waitFor(() => expect(controllerRef.current?.isReady()).toBe(true))

    await act(async () => {
      await controllerRef.current?.save({
        necessary: true,
        analytics: true,
        marketing: false,
      })
    })

    const storedPreferences = localStorage.getItem(
      "roomsily.consent-preferences",
    )
    expect(storedPreferences).toContain('"analytics":true')

    unmount()

    const secondControllerRef = React.createRef<ConsentControllerHandle>()
    render(
      <ConsentManagerProvider>
        <ConsentController ref={secondControllerRef} />
        <ConsentAwareScripts />
      </ConsentManagerProvider>,
    )

    await waitFor(() => expect(secondControllerRef.current).not.toBeNull())
    await waitFor(() => expect(secondControllerRef.current?.isReady()).toBe(true))

    await waitFor(() => expect(screen.getByTestId("analytics")).toBeDefined())
  })
})
