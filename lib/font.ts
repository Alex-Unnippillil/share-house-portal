export type FontDefinition = {
  family: string
  variable: string
  style: "normal" | "italic"
  weight: string
  display: "swap"
  src: string
  format: string
  preload?: boolean
  stack: string[]
}

export const fontSans: FontDefinition = {
  family: "InterVariable",
  variable: "--font-sans",
  style: "normal",
  weight: "100 900",
  display: "swap",
  src: "/fonts/Inter-roman.var.woff2",
  format: "woff2",
  preload: true,
  stack: [
    '"InterVariable"',
    '"Inter"',
    '"Helvetica Neue"',
    "Helvetica",
    "Arial",
    "ui-sans-serif",
    "system-ui",
    "-apple-system",
    '"Segoe UI"',
    "sans-serif",
  ],
}

export const fontMono: FontDefinition = {
  family: "JetBrainsMonoVariable",
  variable: "--font-mono",
  style: "normal",
  weight: "100 800",
  display: "swap",
  src: "/fonts/JetBrainsMono-Variable.woff2",
  format: "woff2",
  preload: true,
  stack: [
    '"JetBrainsMonoVariable"',
    '"JetBrains Mono"',
    '"Fira Code"',
    '"Fira Mono"',
    '"SFMono-Regular"',
    "Menlo",
    "Monaco",
    "Consolas",
    '"Liberation Mono"',
    '"Courier New"',
    "monospace",
  ],
}

export const fonts: FontDefinition[] = [fontSans, fontMono]
