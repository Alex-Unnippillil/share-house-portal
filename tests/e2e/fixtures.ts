import { test as base, expect } from "@playwright/test"
import { installSyntheticNetworkStubs } from "./support/network"

export const test = base.extend({
  context: async ({ context }, use) => {
    await installSyntheticNetworkStubs(context)
    await use(context)
  },
})

export { expect }
