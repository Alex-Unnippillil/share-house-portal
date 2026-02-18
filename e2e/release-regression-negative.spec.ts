import { expect, test } from "@playwright/test"

test.describe("release regression negative journeys", () => {
  test("payment checkout rejects malformed requests", async ({ request }) => {
    const response = await request.post("/api/stripe/checkout", {
      data: {
        quantity: 1,
      },
    })

    expect(response.status()).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "REQUEST_VALIDATION_ERROR",
      },
    })
  })

  test("booking validation blocks conflict-prone schedule windows", async ({ request }) => {
    const response = await request.post("/api/bookings/validate", {
      data: {
        amenityId: "shoreline-kitchen",
        startTime: "2026-08-10T13:00:00.000Z",
        endTime: "2026-08-10T12:00:00.000Z",
      },
    })

    expect(response.ok()).toBeTruthy()
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      allowed: false,
      errors: expect.arrayContaining([expect.stringMatching(/end time must be after start time/i)]),
    })
  })

  test("unauthorized export access is blocked for unauthenticated users", async ({ request }) => {
    const response = await request.get("/api/exports/finance")

    expect(response.status()).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      message: "Unauthorized",
    })
  })
})
