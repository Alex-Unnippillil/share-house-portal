<template>
  <section class="view view--about">
    <header class="view__header">
      <h1>{{ t("about.title") }}</h1>
      <p>{{ t("about.body") }}</p>
    </header>

    <div class="view__content">
      <BaseCard>
        <template #header>
          <h2>Design system highlights</h2>
        </template>
        <ul class="feature-list">
          <li>Composable tokens for consistent theming and dark mode.</li>
          <li>
            Accessible-first primitives such as skip navigation and focus
            management.
          </li>
          <li>Global stores for session management and user preferences.</li>
        </ul>
      </BaseCard>

      <BaseCard>
        <template #header>
          <h2>Technology stack</h2>
        </template>
        <ul class="feature-list">
          <li>
            Vue 3 with the Composition API and
            <code>&lt;script setup&gt;</code>
            ergonomics.
          </li>
          <li>
            Vite for near-instant feedback, modern bundling, and TypeScript
            tooling.
          </li>
          <li>
            Pinia stores, Vue Router, Axios, and Vue I18n for production-ready
            foundations.
          </li>
        </ul>
      </BaseCard>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n"

const { t } = useI18n()
</script>

<style scoped>
.view {
  display: grid;
  gap: 2rem;
}

.view__header h1 {
  margin: 0;
  font-size: clamp(2rem, 4vw, 2.5rem);
}

.view__header p {
  margin: 0;
  max-width: 60ch;
  color: color-mix(in srgb, var(--color-text) 80%, transparent);
}

.view__content {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.feature-list {
  margin: 0;
  padding-left: 1.25rem;
  display: grid;
  gap: 0.75rem;
}
</style>
