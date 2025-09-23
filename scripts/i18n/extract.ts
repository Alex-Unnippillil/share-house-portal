import { promises as fs } from "node:fs"
import path from "node:path"
import process from "node:process"

import { routing } from "../../i18n/routing"
import { flattenMessages, type Messages } from "../../i18n/utils"

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

async function main() {
  const defaultLocale = routing.defaultLocale
  const locales = routing.locales

  const defaultMessages = await readMessages(defaultLocale)
  const flattenedDefault = flattenMessages(defaultMessages)

  const cacheDir = path.join(process.cwd(), "messages", ".cache")
  await fs.mkdir(cacheDir, { recursive: true })
  await fs.writeFile(
    path.join(cacheDir, `${defaultLocale}-keys.json`),
    JSON.stringify(Object.keys(flattenedDefault).sort(), null, 2),
    "utf8",
  )

  let hasMissing = false

  for (const locale of locales) {
    const localeMessages = await readMessages(locale)
    const flattenedLocale = flattenMessages(localeMessages)

    const missingKeys = Object.keys(flattenedDefault).filter(
      (key) => !(key in flattenedLocale),
    )
    const extraKeys = Object.keys(flattenedLocale).filter(
      (key) => !(key in flattenedDefault),
    )

    if (missingKeys.length === 0 && extraKeys.length === 0) {
      console.log(`✔ Locale "${locale}" is in sync with ${defaultLocale}`)
    } else {
      console.log(`Locale "${locale}" status:`)
      if (missingKeys.length > 0) {
        hasMissing = hasMissing || locale !== defaultLocale
        console.log(`  Missing (${missingKeys.length}):`)
        for (const key of missingKeys) {
          console.log(`    - ${key}`)
        }
      }

      if (extraKeys.length > 0) {
        console.log(`  Extra (${extraKeys.length}):`)
        for (const key of extraKeys) {
          console.log(`    - ${key}`)
        }
      }
    }
  }

  if (hasMissing) {
    process.exitCode = 1
  }
}

void main()
