export const appEnvironments = ["development", "preview", "production"] as const

export type AppEnvironment = (typeof appEnvironments)[number]

export const featureFlagConfig = {
  streamingSsr: {
    description:
      "Enable React suspense boundaries to stream server-rendered payloads for slow data dependencies.",
    defaults: {
      development: true,
      preview: true,
      production: false,
    },
  },
  virtualizedLists: {
    description:
      "Window large collection views on the client to reduce DOM weight while scrolling long datasets.",
    defaults: {
      development: true,
      preview: false,
      production: false,
    },
  },
} as const satisfies Record<
  string,
  {
    description: string
    defaults: Record<AppEnvironment, boolean>
  }
>

export type FeatureFlagName = keyof typeof featureFlagConfig

export type FeatureFlagDefinition =
  (typeof featureFlagConfig)[FeatureFlagName]

export const featureFlagNames = Object.keys(
  featureFlagConfig,
) as FeatureFlagName[]

export function getDefaultFlagsForEnv(
  environment: AppEnvironment,
): Record<FeatureFlagName, boolean> {
  return featureFlagNames.reduce<Record<FeatureFlagName, boolean>>(
    (accumulator, flag) => {
      accumulator[flag] = featureFlagConfig[flag].defaults[environment]
      return accumulator
    },
    {} as Record<FeatureFlagName, boolean>,
  )
}

export function getFeatureFlagDefault(
  flag: FeatureFlagName,
  environment: AppEnvironment,
): boolean {
  return featureFlagConfig[flag].defaults[environment]
}
