import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { clearSingleFlightCache, singleFlight, sleep } from "@/lib/utils"

describe("singleFlight", () => {
  beforeEach(() => {
    clearSingleFlightCache()
  })

  afterEach(() => {
    clearSingleFlightCache()
  })

  it("deduplicates concurrent executions for the same key", async () => {
    const worker = vi.fn(async () => {
      await sleep(5)
      return "payload"
    })

    const results = await Promise.all([
      singleFlight("test", worker),
      singleFlight("test", worker),
      singleFlight("test", worker),
    ])

    expect(results).toEqual(["payload", "payload", "payload"])
    expect(worker).toHaveBeenCalledTimes(1)
  })

  it("allows new executions after a flight resolves", async () => {
    const worker = vi
      .fn(async (value: string) => {
        await sleep(1)
        return value
      })
      .mockImplementationOnce(async (value: string) => {
        await sleep(1)
        return `${value}-first`
      })

    const first = await singleFlight("sequential", () => worker("value"))
    const second = await singleFlight("sequential", () => worker("value"))

    expect(first).toBe("value-first")
    expect(second).toBe("value")
    expect(worker).toHaveBeenCalledTimes(2)
  })

  it("clears failed flights so retries can proceed", async () => {
    const failure = new Error("boom")
    const rejecter = vi
      .fn(async () => {
        await sleep(1)
        throw failure
      })
      .mockName("rejecter")

    await expect(singleFlight("retry", rejecter)).rejects.toThrow(failure)
    expect(rejecter).toHaveBeenCalledTimes(1)

    const resolver = vi.fn(async () => "ok")
    const value = await singleFlight("retry", resolver)

    expect(value).toBe("ok")
    expect(resolver).toHaveBeenCalledTimes(1)
  })
})
