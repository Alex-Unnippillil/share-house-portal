import { createApp, watch } from "vue"

import App from "./App.vue"
import { installDesignSystem } from "./design-system"
import { createI18nInstance } from "./locales"
import router from "./router"
import { setupRouterGuards } from "./router/guards"
import "./styles/global.css"
import { installStores, pinia } from "@/stores"
import { useAuthStore } from "@/stores/auth"
import { usePreferencesStore } from "@/stores/preferences"

const app = createApp(App)

installDesignSystem(app)
installStores(app)

const i18n = createI18nInstance()

app.use(i18n)
app.use(router)

const preferences = usePreferencesStore(pinia)
preferences.hydrate()

watch(
  () => preferences.locale,
  (locale) => {
    i18n.global.locale.value = locale
  },
  { immediate: true }
)

const auth = useAuthStore(pinia)
auth.hydrate()

setupRouterGuards(router, (key) => i18n.global.t(key))

app.mount("#app")
