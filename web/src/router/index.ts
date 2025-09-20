import { createRouter, createWebHistory } from "vue-router"

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("@/views/HomeView.vue"),
      meta: {
        titleKey: "navigation.home",
        requiresAuth: false,
      },
    },
    {
      path: "/about",
      name: "about",
      component: () => import("@/views/AboutView.vue"),
      meta: {
        titleKey: "navigation.about",
        requiresAuth: false,
      },
    },
    {
      path: "/settings",
      name: "settings",
      component: () => import("@/views/SettingsView.vue"),
      meta: {
        titleKey: "navigation.settings",
        requiresAuth: false,
      },
    },
    {
      path: "/:pathMatch(.*)*",
      name: "not-found",
      component: () => import("@/views/NotFoundView.vue"),
      meta: {
        titleKey: "navigation.home",
      },
    },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
