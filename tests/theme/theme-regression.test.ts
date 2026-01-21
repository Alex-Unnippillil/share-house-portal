import fs from "node:fs"
import path from "node:path"

import postcss from "postcss"
import { describe, expect, it } from "vitest"

import tailwindConfig from "@/tailwind.config.ts"

type CssVarMap = Record<string, string>

function extractCssVariables(selector: string): CssVarMap {
  const cssPath = path.resolve(__dirname, "../../app/globals.css")
  const cssContent = fs.readFileSync(cssPath, "utf8")
  const root = postcss.parse(cssContent)
  const variables: CssVarMap = {}

  root.walkRules((rule) => {
    if (rule.selector === selector) {
      rule.walkDecls((decl) => {
        if (decl.prop.startsWith("--")) {
          variables[decl.prop] = decl.value.trim()
        }
      })
    }
  })

  return variables
}

describe("theme tokens", () => {
  it("defines distinct light and dark palettes for background and foreground", () => {
    const rootVars = extractCssVariables(":root")
    const darkVars = extractCssVariables(".dark")

    const trackedVars = [
      "--background",
      "--background-muted",
      "--background-inverse",
      "--foreground",
      "--foreground-muted",
      "--foreground-inverse",
    ]

    for (const token of trackedVars) {
      expect(rootVars[token]).toBeDefined()
      expect(darkVars[token]).toBeDefined()
    }

    expect(rootVars["--background"]).not.toEqual(darkVars["--background"])
    expect(rootVars["--background-muted"]).not.toEqual(darkVars["--background-muted"])
    expect(rootVars["--foreground"]).not.toEqual(darkVars["--foreground"])
    expect(rootVars["--foreground-muted"]).not.toEqual(darkVars["--foreground-muted"])

    expect(rootVars["--background-inverse"]).toEqual(darkVars["--background"])
    expect(darkVars["--background-inverse"]).toEqual(rootVars["--background"])
  })

  it("maps the extended Tailwind tokens to the background and text variants", () => {
    const backgroundTokens =
      // @ts-expect-error - partial typing is acceptable for test assertions
      tailwindConfig.theme?.extend?.colors?.background ?? {}
    const foregroundTokens =
      // @ts-expect-error - partial typing is acceptable for test assertions
      tailwindConfig.theme?.extend?.colors?.foreground ?? {}

    expect(backgroundTokens).toMatchObject({
      DEFAULT: "hsl(var(--background))",
      muted: "hsl(var(--background-muted))",
      inverse: "hsl(var(--background-inverse))",
    })

    expect(foregroundTokens).toMatchObject({
      DEFAULT: "hsl(var(--foreground))",
      muted: "hsl(var(--foreground-muted))",
      inverse: "hsl(var(--foreground-inverse))",
    })
  })
})
