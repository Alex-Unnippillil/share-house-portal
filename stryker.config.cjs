/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
module.exports = {
  mutate: [
    "lib/data/**/*.ts",
    "lib/payments/catch-up.ts",
    "lib/payments/status.ts",
    "lib/payments/currency.ts",
    "lib/utils.ts",
  ],
  testRunner: "vitest",
  vitest: {
    configFile: "vitest.config.ts",
    related: true,
  },
  plugins: ["@stryker-mutator/vitest-runner"],
  reporters: ["clear-text", "html"],
  coverageAnalysis: "perTest",
  thresholds: {
    high: 80,
    low: 70,
    break: 60,
  },
};
