import { describe, expect, it, vi } from "vitest"

import {
  CircuitOpenError,
  OperationTimeoutError,
  RetryExhaustedError,
  isLikelyTransientError,
  providerOutageMessage,
  resetResilienceState,
  resilientRequest,
  retryWithBackoff,
} from "@/lib/resilience"

describe("resilience utilities", () => {
  it("retries transient failures and succeeds", async () => {
    let callCount = 0

    const result = await retryWithBackoff(
      async () => {
        callCount += 1
        if (callCount < 3) {
          throw new Error("503 service unavailable")
        }

        return "ok"
      },
      {
        retries: 3,
        initialDelayMs: 1,
      }
    )

    expect(result.value).toBe("ok")
    expect(result.attempts).toBe(3)
  })

  it("does not retry non-transient failures by default", async () => {
    const operation = vi.fn(async () => {
      throw new Error("validation failed")
    })

    await expect(
      retryWithBackoff(operation, {
        retries: 2,
        initialDelayMs: 1,
      })
    ).rejects.toThrow("validation failed")

    expect(operation).toHaveBeenCalledTimes(1)
  })

  it("throws RetryExhaustedError when retries are exhausted", async () => {
    const operation = vi.fn(async () => {
      throw new Error("503 service unavailable")
    })

    await expect(
      retryWithBackoff(operation, {
        retries: 1,
        initialDelayMs: 1,
      })
    ).rejects.toBeInstanceOf(RetryExhaustedError)

    expect(operation).toHaveBeenCalledTimes(2)
  })

  it("times out requests when operation exceeds timeout", async () => {
    await expect(
      resilientRequest(
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 30))
          return "late"
        },
        {
          provider: "calcom",
          operation: "timeout_test",
          retries: 0,
          timeoutMs: 5,
        }
      )
    ).rejects.toMatchObject({
      name: "RetryExhaustedError",
      cause: expect.any(OperationTimeoutError),
    })
  })

  it("opens the circuit after repeated transient failures", async () => {
    resetResilienceState()

    await expect(
      resilientRequest(
        async () => {
          throw new Error("503 service unavailable")
        },
        {
          provider: "documenso",
          operation: "create_document",
          retries: 0,
          circuitFailureThreshold: 1,
          timeoutMs: 10,
        }
      )
    ).rejects.toBeInstanceOf(Error)

    await expect(
      resilientRequest(
        async () => "ok",
        {
          provider: "documenso",
          operation: "create_document",
          retries: 0,
          timeoutMs: 10,
        }
      )
    ).rejects.toBeInstanceOf(CircuitOpenError)
  })

  it("provides provider-safe outage messages", () => {
    expect(providerOutageMessage("stripe")).toContain("temporarily unavailable")
    expect(providerOutageMessage("calcom")).toContain("temporarily degraded")
    expect(providerOutageMessage("documenso")).toContain("temporarily unavailable")
  })

  it("detects transient error messages", () => {
    expect(isLikelyTransientError(new Error("504 timeout"))).toBe(true)
    expect(isLikelyTransientError(new Error("invalid payload"))).toBe(false)
  })
})
