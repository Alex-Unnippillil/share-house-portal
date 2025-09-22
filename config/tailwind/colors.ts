export const overlayThemeTokens = {
  light: {
    scrim: "222 47% 11%",
    surface: "210 40% 98%",
    surfaceForeground: "222 47% 11%",
    outline: "215 25% 65%",
    storage: "188 72% 32%",
    storageForeground: "210 40% 98%",
    chores: "276 65% 35%",
    choresForeground: "210 40% 98%",
    maintenance: "26 90% 38%",
    maintenanceForeground: "210 40% 98%",
    visitors: "204 78% 34%",
    visitorsForeground: "210 40% 98%",
  },
  dark: {
    scrim: "222 67% 4%",
    surface: "222 47% 16%",
    surfaceForeground: "210 40% 96%",
    outline: "215 15% 50%",
    storage: "188 75% 42%",
    storageForeground: "222 47% 11%",
    chores: "276 65% 55%",
    choresForeground: "210 40% 98%",
    maintenance: "26 90% 52%",
    maintenanceForeground: "222 47% 11%",
    visitors: "204 78% 52%",
    visitorsForeground: "222 47% 11%",
  },
} as const

export const overlayColorPalette = {
  overlay: {
    scrim: "hsl(var(--overlay-scrim))",
    outline: "hsl(var(--overlay-outline))",
    surface: {
      DEFAULT: "hsl(var(--overlay-surface))",
      foreground: "hsl(var(--overlay-surface-foreground))",
    },
    storage: {
      DEFAULT: "hsl(var(--overlay-storage))",
      foreground: "hsl(var(--overlay-storage-foreground))",
    },
    chores: {
      DEFAULT: "hsl(var(--overlay-chores))",
      foreground: "hsl(var(--overlay-chores-foreground))",
    },
    maintenance: {
      DEFAULT: "hsl(var(--overlay-maintenance))",
      foreground: "hsl(var(--overlay-maintenance-foreground))",
    },
    visitors: {
      DEFAULT: "hsl(var(--overlay-visitors))",
      foreground: "hsl(var(--overlay-visitors-foreground))",
    },
  },
} as const

export const overlaySemanticTokens = [
  "storage",
  "chores",
  "maintenance",
  "visitors",
] as const

export type OverlaySemanticToken = (typeof overlaySemanticTokens)[number]
