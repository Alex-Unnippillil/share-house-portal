import { getRequestConfig } from "next-intl/server"

import { defaultLocale, fallbackLocales, locales, type Locale } from "./routing"
import { mergeMessages, type Messages } from "./utils"

function isLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale)
}

async function loadMessages(locale: Locale): Promise<Messages> {
  const module = await import(`../messages/${locale}.json`)
  return module.default
}

export default getRequestConfig(async ({ locale }) => {
  const activeLocale = isLocale(locale) ? locale : defaultLocale
  const fallbackChain = fallbackLocales[activeLocale] ?? [defaultLocale]

  let messages: Messages = {}
  for (const candidateLocale of fallbackChain) {
    const loadedMessages = await loadMessages(candidateLocale)
    messages = mergeMessages(messages, loadedMessages)
  }

  return {
    locale: activeLocale,
    messages,
  }
})
