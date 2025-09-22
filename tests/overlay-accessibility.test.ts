import { describe, expect, it } from "vitest"

import { overlayThemeTokens } from "@/config/tailwind/colors"

type ThemeMode = keyof typeof overlayThemeTokens

type OverlayToken = "storage" | "chores" | "maintenance" | "visitors"

const OVERLAY_TOKENS: OverlayToken[] = ["storage", "chores", "maintenance", "visitors"]
const CONTRAST_TARGET = 4.5

interface RGB {
  r: number
  g: number
  b: number
}

const parseHsl = (value: string) => {
  const [hueRaw, saturationRaw, lightnessRaw] = value.trim().split(/\s+/)
  const hue = Number.parseFloat(hueRaw)
  const saturation = Number.parseFloat(saturationRaw.replace("%", "")) / 100
  const lightness = Number.parseFloat(lightnessRaw.replace("%", "")) / 100

  return { hue, saturation, lightness }
}

const hueToRgb = (p: number, q: number, t: number) => {
  let temp = t
  if (temp < 0) temp += 1
  if (temp > 1) temp -= 1
  if (temp < 1 / 6) return p + (q - p) * 6 * temp
  if (temp < 1 / 2) return q
  if (temp < 2 / 3) return p + (q - p) * (2 / 3 - temp) * 6
  return p
}

const hslToRgb = (value: string): RGB => {
  const { hue, saturation, lightness } = parseHsl(value)

  if (saturation === 0) {
    const channel = lightness * 255
    return { r: channel, g: channel, b: channel }
  }

  const q =
    lightness < 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation
  const p = 2 * lightness - q

  const r = hueToRgb(p, q, hue / 360 + 1 / 3)
  const g = hueToRgb(p, q, hue / 360)
  const b = hueToRgb(p, q, hue / 360 - 1 / 3)

  return { r: r * 255, g: g * 255, b: b * 255 }
}

const channelLuminance = (channel: number) => {
  const normalized = channel / 255
  return normalized <= 0.03928
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4)
}

const relativeLuminance = ({ r, g, b }: RGB) =>
  0.2126 * channelLuminance(r) +
  0.7152 * channelLuminance(g) +
  0.0722 * channelLuminance(b)

const contrastRatio = (foreground: RGB, background: RGB) => {
  const l1 = relativeLuminance(foreground)
  const l2 = relativeLuminance(background)
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1]
  return (lighter + 0.05) / (darker + 0.05)
}

describe("overlay color accessibility", () => {
  const modes: ThemeMode[] = ["light", "dark"]

  modes.forEach((mode) => {
    it(`${mode} surface foreground maintains contrast`, () => {
      const tokens = overlayThemeTokens[mode]
      const contrast = contrastRatio(
        hslToRgb(tokens.surfaceForeground),
        hslToRgb(tokens.surface)
      )

      expect(contrast).toBeGreaterThanOrEqual(CONTRAST_TARGET)
    })

    OVERLAY_TOKENS.forEach((token) => {
      it(`${mode} ${token} overlay meets WCAG contrast`, () => {
        const tokens = overlayThemeTokens[mode]
        const background = tokens[token]
        const foregroundKey = `${token}Foreground` as keyof typeof tokens
        const foreground = tokens[foregroundKey]

        const contrast = contrastRatio(hslToRgb(foreground), hslToRgb(background))
        expect(contrast).toBeGreaterThanOrEqual(CONTRAST_TARGET)
      })
    })
  })
})
