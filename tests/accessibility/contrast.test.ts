import { describe, expect, it } from "vitest"

type ThemeName = "light" | "dark" | "high-contrast"

type ThemeTokens = Record<string, string>

type ContrastPair = {
  label: string
  tokens: [string, string]
  thresholds?: Partial<Record<ThemeName | "default", number>>
}

const themeTokens: Record<ThemeName, ThemeTokens> = {
  light: {
    background: "0 0% 100%",
    foreground: "222 47% 11%",
    card: "0 0% 100%",
    "card-foreground": "222 47% 11%",
    primary: "222 47% 11%",
    "primary-foreground": "0 0% 100%",
    secondary: "210 40% 96%",
    "secondary-foreground": "222 47% 11%",
    muted: "210 40% 96%",
    "muted-foreground": "215 20% 45%",
    accent: "210 40% 96%",
    "accent-foreground": "222 47% 11%",
    destructive: "0 72% 51%",
    "destructive-foreground": "0 0% 100%",
  },
  dark: {
    background: "222 47% 11%",
    foreground: "210 40% 98%",
    card: "222 47% 11%",
    "card-foreground": "210 40% 98%",
    primary: "210 40% 98%",
    "primary-foreground": "222 47% 11%",
    secondary: "217 33% 17%",
    "secondary-foreground": "210 40% 98%",
    muted: "217 33% 17%",
    "muted-foreground": "215 20% 65%",
    accent: "217 33% 17%",
    "accent-foreground": "210 40% 98%",
    destructive: "0 72% 60%",
    "destructive-foreground": "222 47% 11%",
  },
  "high-contrast": {
    background: "222 87% 8%",
    foreground: "210 40% 98%",
    card: "222 84% 12%",
    "card-foreground": "210 40% 98%",
    primary: "50 100% 56%",
    "primary-foreground": "222 87% 8%",
    secondary: "196 100% 58%",
    "secondary-foreground": "222 87% 8%",
    muted: "222 64% 22%",
    "muted-foreground": "210 35% 88%",
    accent: "142 80% 52%",
    "accent-foreground": "222 87% 8%",
    destructive: "0 100% 75%",
    "destructive-foreground": "222 87% 8%",
  },
}

const contrastPairs: ContrastPair[] = [
  {
    label: "Body text",
    tokens: ["foreground", "background"],
    thresholds: { default: 4.5, "high-contrast": 7 },
  },
  {
    label: "Card copy",
    tokens: ["card-foreground", "card"],
    thresholds: { default: 4.5, "high-contrast": 7 },
  },
  {
    label: "Muted metadata",
    tokens: ["muted-foreground", "background"],
    thresholds: { default: 4.5, "high-contrast": 7 },
  },
  {
    label: "Muted container copy",
    tokens: ["muted-foreground", "muted"],
    thresholds: { default: 4.5, "high-contrast": 7 },
  },
  {
    label: "Primary button",
    tokens: ["primary-foreground", "primary"],
    thresholds: { default: 4.5, "high-contrast": 7 },
  },
  {
    label: "Secondary badge",
    tokens: ["secondary-foreground", "secondary"],
    thresholds: { default: 4.5, "high-contrast": 7 },
  },
  {
    label: "Accent chip",
    tokens: ["accent-foreground", "accent"],
    thresholds: { default: 4.5, "high-contrast": 7 },
  },
  {
    label: "Destructive action",
    tokens: ["destructive-foreground", "destructive"],
    thresholds: { default: 4.5, "high-contrast": 7 },
  },
]

const WCAG = {
  AA: 4.5,
  AAA: 7,
} as const

type Rating = keyof typeof WCAG | "fail"

function parseHsl(value: string) {
  const [rawH, rawS, rawL] = value.trim().split(/\s+/)
  const h = Number.parseFloat(rawH)
  const s = Number.parseFloat(rawS.replace("%", "")) / 100
  const l = Number.parseFloat(rawL.replace("%", "")) / 100
  return { h, s, l }
}

function hslToRgb({ h, s, l }: ReturnType<typeof parseHsl>) {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const hp = h / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  let r1 = 0
  let g1 = 0
  let b1 = 0

  if (hp >= 0 && hp < 1) {
    r1 = c
    g1 = x
  } else if (hp >= 1 && hp < 2) {
    r1 = x
    g1 = c
  } else if (hp >= 2 && hp < 3) {
    g1 = c
    b1 = x
  } else if (hp >= 3 && hp < 4) {
    g1 = x
    b1 = c
  } else if (hp >= 4 && hp < 5) {
    r1 = x
    b1 = c
  } else if (hp >= 5 && hp <= 6) {
    r1 = c
    b1 = x
  }

  const m = l - c / 2

  return [r1 + m, g1 + m, b1 + m] as const
}

function relativeLuminance(rgb: readonly number[]) {
  const [r, g, b] = rgb.map((value) =>
    value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4),
  ) as const

  return r * 0.2126 + g * 0.7152 + b * 0.0722
}

function contrastRatio(foreground: string, background: string) {
  const fgRgb = hslToRgb(parseHsl(foreground))
  const bgRgb = hslToRgb(parseHsl(background))
  const fgLuminance = relativeLuminance(fgRgb)
  const bgLuminance = relativeLuminance(bgRgb)
  const [lighter, darker] = fgLuminance > bgLuminance
    ? [fgLuminance, bgLuminance]
    : [bgLuminance, fgLuminance]

  return (lighter + 0.05) / (darker + 0.05)
}

function wcagRating(ratio: number): Rating {
  if (ratio >= WCAG.AAA) return "AAA"
  if (ratio >= WCAG.AA) return "AA"
  return "fail"
}
function auditTheme(themeName: ThemeName) {
  const palette = themeTokens[themeName]

  return contrastPairs.map(({ label, tokens, thresholds }) => {
    const [foregroundToken, backgroundToken] = tokens
    const foreground = palette[foregroundToken]
    const background = palette[backgroundToken]

    if (!foreground || !background) {
      throw new Error(`Missing token pair ${foregroundToken} / ${backgroundToken} for theme ${themeName}`)
    }

    const ratio = Number(contrastRatio(foreground, background).toFixed(2))
    const requirement = thresholds?.[themeName] ?? thresholds?.default ?? WCAG.AA

    if (ratio < requirement) {
      throw new Error(
        `${label} failed ${themeName} requirement: got ${ratio}, expected ≥ ${requirement}`,
      )
    }

    const requirementLevel: Rating = requirement >= WCAG.AAA ? "AAA" : "AA"
    const achieved = wcagRating(ratio)

    return {
      pair: label,
      ratio,
      required: requirementLevel,
      achieved,
    }
  })
}

describe("theme color contrast", () => {
  it("light palette clears contrast audits", () => {
    expect(auditTheme("light")).toMatchInlineSnapshot(`
      [
        {
          "achieved": "AAA",
          "pair": "Body text",
          "ratio": 17.9,
          "required": "AA",
        },
        {
          "achieved": "AAA",
          "pair": "Card copy",
          "ratio": 17.9,
          "required": "AA",
        },
        {
          "achieved": "AA",
          "pair": "Muted metadata",
          "ratio": 5.14,
          "required": "AA",
        },
        {
          "achieved": "AA",
          "pair": "Muted container copy",
          "ratio": 4.68,
          "required": "AA",
        },
        {
          "achieved": "AAA",
          "pair": "Primary button",
          "ratio": 17.9,
          "required": "AA",
        },
        {
          "achieved": "AAA",
          "pair": "Secondary badge",
          "ratio": 16.31,
          "required": "AA",
        },
        {
          "achieved": "AAA",
          "pair": "Accent chip",
          "ratio": 16.31,
          "required": "AA",
        },
        {
          "achieved": "AA",
          "pair": "Destructive action",
          "ratio": 4.8,
          "required": "AA",
        },
      ]
    `)
  })

  it("dark palette clears contrast audits", () => {
    expect(auditTheme("dark")).toMatchInlineSnapshot(`
      [
        {
          "achieved": "AAA",
          "pair": "Body text",
          "ratio": 17.09,
          "required": "AA",
        },
        {
          "achieved": "AAA",
          "pair": "Card copy",
          "ratio": 17.09,
          "required": "AA",
        },
        {
          "achieved": "AA",
          "pair": "Muted metadata",
          "ratio": 6.96,
          "required": "AA",
        },
        {
          "achieved": "AA",
          "pair": "Muted container copy",
          "ratio": 5.77,
          "required": "AA",
        },
        {
          "achieved": "AAA",
          "pair": "Primary button",
          "ratio": 17.09,
          "required": "AA",
        },
        {
          "achieved": "AAA",
          "pair": "Secondary badge",
          "ratio": 14.16,
          "required": "AA",
        },
        {
          "achieved": "AAA",
          "pair": "Accent chip",
          "ratio": 14.16,
          "required": "AA",
        },
        {
          "achieved": "AA",
          "pair": "Destructive action",
          "ratio": 4.69,
          "required": "AA",
        },
      ]
    `)
  })

  it("high-contrast palette clears contrast audits", () => {
    expect(auditTheme("high-contrast")).toMatchInlineSnapshot(`
      [
        {
          "achieved": "AAA",
          "pair": "Body text",
          "ratio": 18.38,
          "required": "AAA",
        },
        {
          "achieved": "AAA",
          "pair": "Card copy",
          "ratio": 17.19,
          "required": "AAA",
        },
        {
          "achieved": "AAA",
          "pair": "Muted metadata",
          "ratio": 14.45,
          "required": "AAA",
        },
        {
          "achieved": "AAA",
          "pair": "Muted container copy",
          "ratio": 10.42,
          "required": "AAA",
        },
        {
          "achieved": "AAA",
          "pair": "Primary button",
          "ratio": 13.99,
          "required": "AAA",
        },
        {
          "achieved": "AAA",
          "pair": "Secondary badge",
          "ratio": 9.72,
          "required": "AAA",
        },
        {
          "achieved": "AAA",
          "pair": "Accent chip",
          "ratio": 11.6,
          "required": "AAA",
        },
        {
          "achieved": "AAA",
          "pair": "Destructive action",
          "ratio": 7.91,
          "required": "AAA",
        },
      ]
    `)
  })
})
