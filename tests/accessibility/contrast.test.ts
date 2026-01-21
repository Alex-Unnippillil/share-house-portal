import { describe, expect, it } from "vitest"

import { contrastPairs } from "@/config/tokens/accessibility"

describe("design tokens contrast", () => {
  const modes = ["light", "dark"] as const

  contrastPairs.forEach((pair) => {
    modes.forEach((mode) => {
      it(`${pair.label} (${mode} mode) meets WCAG AA`, () => {
        expect(pair.ratios[mode].value).toBeGreaterThanOrEqual(pair.minRatio)
        expect(pair.ratios[mode].ratings.aaNormalText).toBe(true)
      })
    })
  })
})
