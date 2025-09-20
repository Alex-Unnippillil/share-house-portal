import { createPinia, setActivePinia } from "pinia"
import type { App } from "vue"

export const pinia = createPinia()

export function installStores(app: App) {
  app.use(pinia)
  setActivePinia(pinia)
}
