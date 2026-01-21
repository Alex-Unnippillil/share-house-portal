import { afterEach, describe, expect, it, vi } from "vitest"

import {
  SERVICE_WORKER_PATH,
  isServiceWorkerSupported,
  registerServiceWorker,
} from "@/lib/service-worker"

const globalRef = globalThis as typeof globalThis & {
  window?: unknown
  navigator?: Navigator
}

afterEach(() => {
  vi.restoreAllMocks()
  if ("navigator" in globalRef) {
    delete (globalRef as { navigator?: Navigator }).navigator
  }
  if ("window" in globalRef) {
    delete (globalRef as { window?: unknown }).window
  }
})

describe("isServiceWorkerSupported", () => {
  it("returns false when window is unavailable", () => {
    expect(isServiceWorkerSupported()).toBe(false)
  })

  it("returns true when service workers are available", () => {
    globalRef.window = {}
    globalRef.navigator = {
      serviceWorker: {} as ServiceWorkerContainer,
    } as Navigator

    expect(isServiceWorkerSupported()).toBe(true)
  })
})

describe("registerServiceWorker", () => {
  it("registers the worker when supported", async () => {
    const update = vi.fn().mockResolvedValue(undefined)
    const registration = { update } as unknown as ServiceWorkerRegistration
    const register = vi.fn().mockResolvedValue(registration)

    globalRef.window = {}
    globalRef.navigator = {
      serviceWorker: {
        register,
      } as ServiceWorkerContainer,
    } as Navigator

    const result = await registerServiceWorker()

    expect(register).toHaveBeenCalledWith(SERVICE_WORKER_PATH)
    expect(update).toHaveBeenCalled()
    expect(result).toBe(registration)
  })

  it("resolves undefined when unsupported", async () => {
    const result = await registerServiceWorker()
    expect(result).toBeUndefined()
  })

  it("logs and swallows registration errors", async () => {
    const error = new Error("boom")
    const register = vi.fn().mockRejectedValue(error)
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)

    globalRef.window = {}
    globalRef.navigator = {
      serviceWorker: {
        register,
      } as ServiceWorkerContainer,
    } as Navigator

    const result = await registerServiceWorker()

    expect(register).toHaveBeenCalledWith(SERVICE_WORKER_PATH)
    expect(consoleSpy).toHaveBeenCalledWith("Failed to register service worker", error)
    expect(result).toBeUndefined()
  })
})
