import { pinia } from "@/stores"
import { useAuthStore } from "@/stores/auth"
import type { Router } from "vue-router"

export function setupRouterGuards(
  router: Router,
  translate: (key: string) => string
) {
  router.beforeEach((to, _from, next) => {
    const auth = useAuthStore(pinia)

    if (!auth.isInitialized) {
      auth.hydrate()
    }

    if (to.meta.requiresAuth && !auth.isAuthenticated) {
      next({ name: "home" })
      return
    }

    next()
  })

  router.afterEach((to) => {
    if (typeof document !== "undefined") {
      const titleKey =
        typeof to.meta.titleKey === "string"
          ? to.meta.titleKey
          : "navigation.home"
      const translated = translate(titleKey)
      document.title = `${translate("app.title")} • ${translated}`

      requestAnimationFrame(() => {
        const main = document.querySelector<HTMLElement>("#main-content")
        main?.focus()
      })
    }
  })
}
