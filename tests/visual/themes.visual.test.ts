import fs from "node:fs"
import path from "node:path"

import postcss from "postcss"
import { describe, expect, it } from "vitest"

import { APP_THEME_LABELS, APP_THEMES, type AppTheme } from "@/config/themes"

type ThemeSelector = ":root" | ".dark" | ".high-contrast"

const REQUIRED_TOKENS = [
  "--background",
  "--foreground",
  "--card",
  "--card-foreground",
  "--popover",
  "--popover-foreground",
  "--primary",
  "--primary-foreground",
  "--secondary",
  "--secondary-foreground",
  "--muted",
  "--muted-foreground",
  "--accent",
  "--accent-foreground",
  "--destructive",
  "--destructive-foreground",
  "--border",
  "--input",
  "--ring",
]

const CONTRAST_PAIRS: Array<[string, string]> = [
  ["--background", "--foreground"],
  ["--card", "--card-foreground"],
  ["--popover", "--popover-foreground"],
  ["--primary", "--primary-foreground"],
  ["--secondary", "--secondary-foreground"],
  ["--accent", "--accent-foreground"],
  ["--destructive", "--destructive-foreground"],
]

const cssPath = path.resolve(__dirname, "../../app/globals.css")
const cssSource = fs.readFileSync(cssPath, "utf8")
const parsed = postcss.parse(cssSource)

const selectorMap: Record<AppTheme, ThemeSelector> = {
  light: ":root",
  dark: ".dark",
  "high-contrast": ".high-contrast",
}

const themeVariables: Record<ThemeSelector, Record<string, string>> = {
  ":root": {},
  ".dark": {},
  ".high-contrast": {},
}

parsed.walkRules((rule) => {
  const selector = rule.selector as ThemeSelector | undefined

  if (!selector || !(selector in themeVariables)) {
    return
  }

  rule.walkDecls((decl) => {
    if (decl.prop.startsWith("--")) {
      themeVariables[selector][decl.prop] = decl.value
    }
  })
})

const toThemeTokens = (theme: AppTheme) =>
  themeVariables[selectorMap[theme]] ?? {}

const parseHsl = (value: string) => {
  const [hue, saturation, lightness] = value.trim().split(/\s+/)

  const h = Number.parseFloat(hue)
  const s = Number.parseFloat(saturation.replace("%", "")) / 100
  const l = Number.parseFloat(lightness.replace("%", "")) / 100

  return { h, s, l }
}

const hslToRgb = ({ h, s, l }: { h: number; s: number; l: number }) => {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const hh = h / 60
  const x = c * (1 - Math.abs((hh % 2) - 1))
  const m = l - c / 2

  let r = 0
  let g = 0
  let b = 0

  if (hh >= 0 && hh < 1) {
    r = c
    g = x
  } else if (hh >= 1 && hh < 2) {
    r = x
    g = c
  } else if (hh >= 2 && hh < 3) {
    g = c
    b = x
  } else if (hh >= 3 && hh < 4) {
    g = x
    b = c
  } else if (hh >= 4 && hh < 5) {
    r = x
    b = c
  } else if (hh >= 5 && hh < 6) {
    r = c
    b = x
  }

  return {
    r: r + m,
    g: g + m,
    b: b + m,
  }
}

const relativeLuminance = ({ r, g, b }: { r: number; g: number; b: number }) => {
  const transform = (value: number) =>
    value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4)

  const R = transform(r)
  const G = transform(g)
  const B = transform(b)

  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}

const contrastRatio = (first: string, second: string) => {
  const firstRgb = hslToRgb(parseHsl(first))
  const secondRgb = hslToRgb(parseHsl(second))
  const firstLum = relativeLuminance(firstRgb)
  const secondLum = relativeLuminance(secondRgb)
  const [bright, dark] = firstLum >= secondLum
    ? [firstLum, secondLum]
    : [secondLum, firstLum]

  return (bright + 0.05) / (dark + 0.05)
}

describe("theme tokens", () => {
  it("defines a consistent set of CSS variables for each theme", () => {
    for (const theme of APP_THEMES) {
      const tokens = toThemeTokens(theme)

      for (const token of REQUIRED_TOKENS) {
        expect(tokens[token]).toBeDefined()
      }
    }
  })

  it("keeps high-contrast pairs above AAA thresholds", () => {
    const highContrastTokens = toThemeTokens("high-contrast")

    expect(Object.keys(highContrastTokens).length).toBeGreaterThan(0)

    for (const [backgroundToken, foregroundToken] of CONTRAST_PAIRS) {
      const background = highContrastTokens[backgroundToken]
      const foreground = highContrastTokens[foregroundToken]

      expect(background, `${backgroundToken} is missing`).toBeDefined()
      expect(foreground, `${foregroundToken} is missing`).toBeDefined()

      const ratio = contrastRatio(background, foreground)

      expect(ratio).toBeGreaterThanOrEqual(7)
    }
  })

  it("retains human readable labels for reporting", () => {
    const labels = APP_THEMES.map((theme) => APP_THEME_LABELS[theme])

    expect(labels).toEqual([
      "Light",
      "Dark",
      "High contrast",
    ])
  })
})
