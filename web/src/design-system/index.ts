import type { App } from "vue"

import BaseButton from "./components/BaseButton.vue"
import BaseCard from "./components/BaseCard.vue"
import BaseLink from "./components/BaseLink.vue"

const components = {
  BaseButton,
  BaseCard,
  BaseLink,
}

export function installDesignSystem(app: App) {
  Object.entries(components).forEach(([name, component]) => {
    app.component(name, component)
  })
}

export { BaseButton, BaseCard, BaseLink }
