import { promises as fs } from "node:fs"
import path from "node:path"
import process from "node:process"

import { routing, type Locale } from "../../i18n/routing"
import { mergeMessages, type Messages } from "../../i18n/utils"

async function readMessages(locale: string): Promise<Messages> {
  const filePath = path.join(process.cwd(), "messages", `${locale}.json`)

  try {
    const raw = await fs.readFile(filePath, "utf8")
    return JSON.parse(raw) as Messages
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {}
    }

    throw error
  }
}

async function compileLocale(locale: Locale): Promise<Messages> {
  const fallbackChain = routing.fallbackLocales[locale] ?? [routing.defaultLocale]

  let merged: Messages = {}
  for (const candidate of fallbackChain) {
    const candidateMessages = await readMessages(candidate)
    merged = mergeMessages(merged, candidateMessages)
  }

  return merged
}

async function main() {
  const outputDir = path.join(process.cwd(), "messages", ".compiled")
  await fs.mkdir(outputDir, { recursive: true })

  for (const locale of routing.locales) {
    const merged = await compileLocale(locale)
    const filePath = path.join(outputDir, `${locale}.json`)
    await fs.writeFile(filePath, JSON.stringify(merged, null, 2), "utf8")
    console.log(`✔ Compiled messages for "${locale}" → ${path.relative(process.cwd(), filePath)}`)
  }
}

void main()
