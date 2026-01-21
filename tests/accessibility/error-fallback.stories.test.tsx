import { afterEach, describe, expect, it } from "vitest"
import { composeStories } from "@storybook/testing-react"
import { cleanup, render } from "@testing-library/react"
import { axe } from "vitest-axe"
import { toHaveNoViolations, type AxeMatchers } from "vitest-axe/matchers"

declare module "vitest" {
  interface Assertion<T = any> extends AxeMatchers {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}

import * as stories from "@/components/feedback/__stories__/ErrorFallback.stories"

expect.extend({ toHaveNoViolations })

afterEach(() => {
  cleanup()
})

const { Default, PaymentsRoute, DocumentsRoute, WithDetails } = composeStories(stories)

const scenarios = [
  { name: "default", Story: Default },
  { name: "payments", Story: PaymentsRoute },
  { name: "documents", Story: DocumentsRoute },
  { name: "details", Story: WithDetails },
] as const

describe("ErrorFallback accessibility", () => {
  it.each(scenarios)("%s story has no accessibility violations", async ({ Story }) => {
    const { container } = render(<Story />)
    const results = await axe(container, {
      rules: {
        "color-contrast": { enabled: false },
      },
    })
    expect(results).toHaveNoViolations()
  })
})
