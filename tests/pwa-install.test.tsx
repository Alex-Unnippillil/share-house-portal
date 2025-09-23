// @vitest-environment jsdom

globalThis.IS_REACT_ACT_ENVIRONMENT = true

import { beforeEach, describe, expect, it, vi } from "vitest"
import React from "react"
import { act } from "react-dom/test-utils"
import { createRoot } from "react-dom/client"
import fs from "node:fs"
import path from "node:path"

import {
  InstallPromptCta,
  InstallPromptProvider,
} from "@/components/pwa/InstallPrompt"

type MockBeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

function createBeforeInstallPromptEvent(
  outcome: "accepted" | "dismissed" = "dismissed",
): MockBeforeInstallPromptEvent {
  const event = new Event("beforeinstallprompt") as MockBeforeInstallPromptEvent

  Object.defineProperty(event, "prompt", {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  })

  Object.defineProperty(event, "userChoice", {
    configurable: true,
    value: Promise.resolve({ outcome, platform: "test" }),
  })

  return event
}

describe("PWA install prompt", () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it("surfaces the install CTA only once per session", async () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root = createRoot(container)

    act(() => {
      root.render(
        <InstallPromptProvider>
          <InstallPromptCta />
        </InstallPromptProvider>,
      )
    })

    act(() => {
      window.dispatchEvent(createBeforeInstallPromptEvent())
    })

    expect(
      container.querySelectorAll('[data-testid="pwa-install-cta"]').length,
    ).toBe(1)

    act(() => {
      root.unmount()
    })
    container.remove()

    const secondContainer = document.createElement("div")
    document.body.appendChild(secondContainer)
    const secondRoot = createRoot(secondContainer)

    act(() => {
      secondRoot.render(
        <InstallPromptProvider>
          <InstallPromptCta />
        </InstallPromptProvider>,
      )
    })

    act(() => {
      window.dispatchEvent(createBeforeInstallPromptEvent())
    })

    expect(
      secondContainer.querySelector('[data-testid="pwa-install-cta"]'),
    ).toBeNull()

    act(() => {
      secondRoot.unmount()
    })
    secondContainer.remove()
  })

  it("exposes shortcuts for core resident actions", () => {
    const manifestPath = path.resolve(process.cwd(), "public/manifest.json")
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"))

    expect(manifest.shortcuts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Pay Rent", url: "/payments" }),
        expect.objectContaining({ name: "Book Amenity", url: "/bookings" }),
        expect.objectContaining({ name: "Log Maintenance", url: "/maintenance" }),
      ]),
    )
  })
})
