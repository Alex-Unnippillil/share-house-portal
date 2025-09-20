import { createI18n } from "vue-i18n"

import en from "./en.json"
import es from "./es.json"

export const messages = {
  en,
  es,
}

export type Locale = keyof typeof messages

export function createI18nInstance(locale: Locale = "en") {
  return createI18n({
    legacy: false,
    globalInjection: true,
    locale,
    fallbackLocale: "en",
    messages,
  })
}
