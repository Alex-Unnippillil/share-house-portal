import resolveConfig from "tailwindcss/resolveConfig"

import tailwindConfig from "../../tailwind.config"

export type ThemeMode = "light" | "dark"

type RawColorToken = {
  name: string
  cssVariable: string
  role: string
  description: string
  values: Record<ThemeMode, string>
}

type HslComponents = {
  h: number
  s: number
  l: number
}

type RgbColor = {
  r: number
  g: number
  b: number
}

export type ColorModeMeta = {
  hsl: string
  css: string
  rgb: RgbColor
  hex: string
  luminance: number
}

export type ColorToken = {
  name: string
  cssVariable: string
  role: string
  description: string
  modes: Record<ThemeMode, ColorModeMeta>
}

export type ContrastRatings = {
  aaLargeText: boolean
  aaNormalText: boolean
  aaa: boolean
}

export type ContrastMeasurement = {
  value: number
  rounded: number
  ratings: ContrastRatings
}

export type ContrastPair = {
  id: string
  label: string
  description: string
  foreground: ColorToken
  background: ColorToken
  ratios: Record<ThemeMode, ContrastMeasurement>
  minRatio: number
}

export type TypeScaleEntry = {
  token: string
  fontSize: string
  fontSizePx: number
  lineHeight: string
  lineHeightPx: number
  isLargeText: boolean
  recommendedContrast: number
}

const rawColorTokens: RawColorToken[] = [
  {
    name: "Background",
    cssVariable: "--background",
    role: "surface",
    description: "Primary application canvas and neutral surface color.",
    values: {
      light: "0 0% 100%",
      dark: "222 47% 11%",
    },
  },
  {
    name: "Foreground",
    cssVariable: "--foreground",
    role: "text",
    description: "Default body text color used on base surfaces.",
    values: {
      light: "222 47% 11%",
      dark: "210 40% 98%",
    },
  },
  {
    name: "Card",
    cssVariable: "--card",
    role: "surface",
    description: "Card and panel surfaces that layer on top of the background.",
    values: {
      light: "0 0% 100%",
      dark: "222 47% 11%",
    },
  },
  {
    name: "Card Foreground",
    cssVariable: "--card-foreground",
    role: "text",
    description: "Text color for content placed on card surfaces.",
    values: {
      light: "222 47% 11%",
      dark: "210 40% 98%",
    },
  },
  {
    name: "Popover",
    cssVariable: "--popover",
    role: "surface",
    description: "Surface color for popovers, dropdowns, and transient overlays.",
    values: {
      light: "0 0% 100%",
      dark: "222 47% 11%",
    },
  },
  {
    name: "Popover Foreground",
    cssVariable: "--popover-foreground",
    role: "text",
    description: "Text color on popover and dropdown surfaces.",
    values: {
      light: "222 47% 11%",
      dark: "210 40% 98%",
    },
  },
  {
    name: "Primary",
    cssVariable: "--primary",
    role: "interactive",
    description: "Primary brand background for buttons and key interactive elements.",
    values: {
      light: "222 47% 11%",
      dark: "210 40% 98%",
    },
  },
  {
    name: "Primary Foreground",
    cssVariable: "--primary-foreground",
    role: "text",
    description: "Text and icon color displayed on primary brand backgrounds.",
    values: {
      light: "0 0% 100%",
      dark: "222 47% 11%",
    },
  },
  {
    name: "Secondary",
    cssVariable: "--secondary",
    role: "surface",
    description: "Subtle secondary surface background for cards and controls.",
    values: {
      light: "210 40% 96%",
      dark: "217 33% 17%",
    },
  },
  {
    name: "Secondary Foreground",
    cssVariable: "--secondary-foreground",
    role: "text",
    description: "Text color for secondary surfaces such as subdued cards.",
    values: {
      light: "222 47% 11%",
      dark: "210 40% 98%",
    },
  },
  {
    name: "Muted",
    cssVariable: "--muted",
    role: "surface",
    description: "Muted background for placeholders, skeletons, and quiet UI.",
    values: {
      light: "210 40% 96%",
      dark: "217 33% 17%",
    },
  },
  {
    name: "Muted Foreground",
    cssVariable: "--muted-foreground",
    role: "text",
    description: "Text and icon color on muted surfaces and disabled states.",
    values: {
      light: "215 20% 45%",
      dark: "215 20% 65%",
    },
  },
  {
    name: "Accent",
    cssVariable: "--accent",
    role: "interactive",
    description: "Accent background for hover states and emphasized UI elements.",
    values: {
      light: "210 40% 96%",
      dark: "217 33% 17%",
    },
  },
  {
    name: "Accent Foreground",
    cssVariable: "--accent-foreground",
    role: "text",
    description: "Text color used on accent backgrounds for high-contrast emphasis.",
    values: {
      light: "222 47% 11%",
      dark: "210 40% 98%",
    },
  },
  {
    name: "Destructive",
    cssVariable: "--destructive",
    role: "interactive",
    description: "Critical action background for destructive and error workflows.",
    values: {
      light: "0 72% 51%",
      dark: "0 62% 30%",
    },
  },
  {
    name: "Destructive Foreground",
    cssVariable: "--destructive-foreground",
    role: "text",
    description: "Text and icon color used on destructive backgrounds.",
    values: {
      light: "0 0% 100%",
      dark: "210 40% 98%",
    },
  },
  {
    name: "Border",
    cssVariable: "--border",
    role: "border",
    description: "Default border color for cards, dividers, and surfaces.",
    values: {
      light: "214 32% 91%",
      dark: "217 33% 17%",
    },
  },
  {
    name: "Input",
    cssVariable: "--input",
    role: "border",
    description: "Input border and background color for form fields.",
    values: {
      light: "214 32% 91%",
      dark: "217 33% 17%",
    },
  },
  {
    name: "Ring",
    cssVariable: "--ring",
    role: "focus",
    description: "Focus ring color used to highlight active elements.",
    values: {
      light: "222 47% 11%",
      dark: "210 40% 98%",
    },
  },
]

const parseHslComponents = (value: string): HslComponents => {
  const [rawH, rawS, rawL] = value.trim().split(/\s+/)
  return {
    h: Number.parseFloat(rawH),
    s: Number.parseFloat(rawS.replace("%", "")) / 100,
    l: Number.parseFloat(rawL.replace("%", "")) / 100,
  }
}

const hslToRgb = ({ h, s, l }: HslComponents): RgbColor => {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const hPrime = h / 60
  const x = c * (1 - Math.abs((hPrime % 2) - 1))
  let r1 = 0
  let g1 = 0
  let b1 = 0

  if (hPrime >= 0 && hPrime < 1) {
    r1 = c
    g1 = x
  } else if (hPrime >= 1 && hPrime < 2) {
    r1 = x
    g1 = c
  } else if (hPrime >= 2 && hPrime < 3) {
    g1 = c
    b1 = x
  } else if (hPrime >= 3 && hPrime < 4) {
    g1 = x
    b1 = c
  } else if (hPrime >= 4 && hPrime < 5) {
    r1 = x
    b1 = c
  } else if (hPrime >= 5 && hPrime < 6) {
    r1 = c
    b1 = x
  }

  const m = l - c / 2

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  }
}

const rgbChannelToHex = (value: number) => value.toString(16).padStart(2, "0")

const rgbToHex = ({ r, g, b }: RgbColor): string =>
  `#${rgbChannelToHex(r)}${rgbChannelToHex(g)}${rgbChannelToHex(b)}`

const toRelativeLuminance = ({ r, g, b }: RgbColor): number => {
  const toLinear = (channel: number) => {
    const normalized = channel / 255
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4)
  }

  const [linearR, linearG, linearB] = [r, g, b].map(toLinear)

  return 0.2126 * linearR + 0.7152 * linearG + 0.0722 * linearB
}

const toColorModeMeta = (value: string): ColorModeMeta => {
  const hsl = parseHslComponents(value)
  const rgb = hslToRgb(hsl)
  return {
    hsl: value,
    css: `hsl(${value})`,
    rgb,
    hex: rgbToHex(rgb),
    luminance: toRelativeLuminance(rgb),
  }
}

export const colorTokens: ColorToken[] = rawColorTokens.map((token) => ({
  name: token.name,
  cssVariable: token.cssVariable,
  role: token.role,
  description: token.description,
  modes: {
    light: toColorModeMeta(token.values.light),
    dark: toColorModeMeta(token.values.dark),
  },
}))

const colorTokenMap = new Map(colorTokens.map((token) => [token.cssVariable, token]))

const getColorToken = (cssVariable: string): ColorToken => {
  const token = colorTokenMap.get(cssVariable)

  if (!token) {
    throw new Error(`Unknown color token: ${cssVariable}`)
  }

  return token
}

const roundToTwoDecimals = (value: number) => Number(value.toFixed(2))

const createRatings = (value: number): ContrastRatings => ({
  aaLargeText: value >= 3,
  aaNormalText: value >= 4.5,
  aaa: value >= 7,
})

const computeContrast = (a: number, b: number): ContrastMeasurement => {
  const value = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)

  return {
    value,
    rounded: roundToTwoDecimals(value),
    ratings: createRatings(value),
  }
}

const contrastPairDefinitions: Array<{
  id: string
  label: string
  description: string
  foreground: string
  background: string
  minRatio: number
}> = [
  {
    id: "background-foreground",
    label: "Foreground on Background",
    description: "Primary body text color on the base application background.",
    foreground: "--foreground",
    background: "--background",
    minRatio: 4.5,
  },
  {
    id: "card-foreground",
    label: "Card Foreground",
    description: "Text color for card surfaces across dashboard content.",
    foreground: "--card-foreground",
    background: "--card",
    minRatio: 4.5,
  },
  {
    id: "popover-foreground",
    label: "Popover Foreground",
    description: "Text color for menus, popovers, and dropdown surfaces.",
    foreground: "--popover-foreground",
    background: "--popover",
    minRatio: 4.5,
  },
  {
    id: "primary-foreground",
    label: "Primary Call-to-Action",
    description: "High emphasis text on primary brand backgrounds.",
    foreground: "--primary-foreground",
    background: "--primary",
    minRatio: 4.5,
  },
  {
    id: "secondary-foreground",
    label: "Secondary Surfaces",
    description: "Text color on secondary surfaces used for subdued sections.",
    foreground: "--secondary-foreground",
    background: "--secondary",
    minRatio: 4.5,
  },
  {
    id: "muted-foreground",
    label: "Muted Surfaces",
    description: "Text on muted backgrounds like skeletons and quiet UI.",
    foreground: "--muted-foreground",
    background: "--muted",
    minRatio: 4.5,
  },
  {
    id: "accent-foreground",
    label: "Accent Surfaces",
    description: "Text and icons on accent backgrounds for hover states.",
    foreground: "--accent-foreground",
    background: "--accent",
    minRatio: 4.5,
  },
  {
    id: "destructive-foreground",
    label: "Destructive Surfaces",
    description: "Text and icon treatment on destructive backgrounds.",
    foreground: "--destructive-foreground",
    background: "--destructive",
    minRatio: 4.5,
  },
]

export const contrastPairs: ContrastPair[] = contrastPairDefinitions.map((definition) => {
  const foreground = getColorToken(definition.foreground)
  const background = getColorToken(definition.background)

  const ratios = {
    light: computeContrast(
      background.modes.light.luminance,
      foreground.modes.light.luminance,
    ),
    dark: computeContrast(
      background.modes.dark.luminance,
      foreground.modes.dark.luminance,
    ),
  }

  return {
    id: definition.id,
    label: definition.label,
    description: definition.description,
    foreground,
    background,
    ratios,
    minRatio: definition.minRatio,
  }
})

const resolvedTailwindConfig = resolveConfig(tailwindConfig)

const rootFontSizePx = 16

const remToPx = (value: string) => Number.parseFloat(value) * rootFontSizePx

const toPixels = (value: string, fontSizePx?: number): number => {
  if (value.endsWith("rem")) {
    return remToPx(value)
  }

  if (value.endsWith("px")) {
    return Number.parseFloat(value)
  }

  const numeric = Number.parseFloat(value)

  if (!Number.isNaN(numeric) && fontSizePx) {
    return numeric * fontSizePx
  }

  return numeric
}

const fontSizeEntries = (resolvedTailwindConfig.theme?.fontSize as Record<
  string,
  [string, { lineHeight: string }]
>) ?? {}

export const typeScale: TypeScaleEntry[] = Object.entries(fontSizeEntries).map(
  ([sizeToken, [fontSize, options]]) => {
    const fontSizePx = toPixels(fontSize)
    const lineHeight = options.lineHeight
    const lineHeightPx = toPixels(lineHeight, fontSizePx)
    const isLargeText = fontSizePx >= 24

    return {
      token: `text-${sizeToken}`,
      fontSize,
      fontSizePx,
      lineHeight,
      lineHeightPx,
      isLargeText,
      recommendedContrast: isLargeText ? 3 : 4.5,
    }
  },
)

