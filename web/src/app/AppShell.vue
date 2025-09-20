<template>
  <div class="app-shell">
    <SkipToContent :label="t('a11y.skipToContent')" />
    <header class="app-shell__header">
      <AppHeader />
    </header>
    <main id="main-content" class="app-shell__main" tabindex="-1">
      <slot />
    </main>
    <footer class="app-shell__footer">
      <AppFooter />
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n"

import SkipToContent from "@/components/common/SkipToContent.vue"
import AppFooter from "@/components/navigation/AppFooter.vue"
import AppHeader from "@/components/navigation/AppHeader.vue"

const { t } = useI18n()
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  background: var(--color-background);
  color: var(--color-text);
}

.app-shell__header,
.app-shell__footer {
  background: transparent;
}

.app-shell__main {
  display: block;
  outline: none;
  padding: 1rem 0 3rem;
}
</style>
