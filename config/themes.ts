export const APP_THEMES = ["light", "dark", "high-contrast"] as const

export type AppTheme = (typeof APP_THEMES)[number]

export const APP_THEME_LABELS: Record<AppTheme, string> = {
  light: "Light",
  dark: "Dark",
  "high-contrast": "High contrast",
}

export const isAppTheme = (value: unknown): value is AppTheme =>
  typeof value === "string" && APP_THEMES.includes(value as AppTheme)
