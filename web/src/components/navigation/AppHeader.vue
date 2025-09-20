<template>
  <header class="app-header">
    <RouterLink class="app-header__brand" to="/">
      <span class="app-header__logo" aria-hidden="true">🏠</span>
      <span class="app-header__title">{{ t("app.title") }}</span>
    </RouterLink>

    <nav class="app-header__nav" aria-label="Main navigation">
      <ul>
        <li v-for="item in navItems" :key="item.to">
          <RouterLink
            :to="item.to"
            class="app-header__nav-link"
            active-class="app-header__nav-link--active"
          >
            {{ item.label }}
          </RouterLink>
        </li>
      </ul>
    </nav>

    <div class="app-header__actions">
      <ThemeSelect />
      <LanguageSelect />
      <BaseButton v-if="auth.isAuthenticated" variant="ghost" @click="signOut">
        {{ t("auth.signOut") }}
      </BaseButton>
      <BaseButton v-else variant="secondary" @click="signIn">
        {{ t("auth.signIn") }}
      </BaseButton>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useAuthStore } from "@/stores/auth"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { RouterLink } from "vue-router"

import LanguageSelect from "./LanguageSelect.vue"
import ThemeSelect from "./ThemeSelect.vue"

const { t } = useI18n()
const auth = useAuthStore()

const navItems = computed(() => [
  { to: "/", label: t("navigation.home") },
  { to: "/about", label: t("navigation.about") },
  { to: "/settings", label: t("navigation.settings") },
])

function signIn() {
  auth.setSession("demo-token", {
    id: crypto.randomUUID(),
    email: "guest@example.com",
    name: t("auth.guest"),
  })
}

function signOut() {
  auth.clearSession()
}
</script>

<style scoped>
.app-header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem 0;
}

.app-header__brand {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 700;
  font-size: 1.1rem;
  text-decoration: none;
  color: var(--color-text);
}

.app-header__logo {
  font-size: 1.75rem;
}

.app-header__nav ul {
  display: flex;
  align-items: center;
  gap: 1rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.app-header__nav-link {
  font-weight: 600;
  color: var(--color-text-muted);
  padding: 0.4rem 0.5rem;
  border-radius: var(--radius-md);
  text-decoration: none;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.app-header__nav-link:hover,
.app-header__nav-link:focus-visible {
  background-color: color-mix(in srgb, var(--color-primary) 12%, transparent);
  color: var(--color-text);
}

.app-header__nav-link--active {
  background-color: color-mix(in srgb, var(--color-primary) 18%, transparent);
  color: var(--color-text);
}

.app-header__actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.app-header__actions > * {
  min-width: 0;
}

@media (max-width: 900px) {
  .app-header {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .app-header__nav ul {
    justify-content: flex-start;
  }

  .app-header__actions {
    flex-wrap: wrap;
    justify-content: flex-start;
  }
}
</style>
