<template>
  <section class="view view--settings">
    <header class="view__header">
      <h1>{{ t("settings.title") }}</h1>
      <p>{{ t("settings.description") }}</p>
    </header>

    <BaseCard>
      <template #header>
        <h2>Interface</h2>
      </template>
      <div class="preferences-grid">
        <ThemeSelect />
        <LanguageSelect />
      </div>
    </BaseCard>

    <BaseCard>
      <template #header>
        <h2>Notifications</h2>
      </template>
      <p>
        Coming soon: connect shared inboxes, webhook automations, and mobile
        push to keep every housemate aligned.
      </p>
      <BaseButton variant="secondary">Join beta waitlist</BaseButton>
    </BaseCard>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n"

import LanguageSelect from "@/components/navigation/LanguageSelect.vue"
import ThemeSelect from "@/components/navigation/ThemeSelect.vue"

const { t } = useI18n()
</script>

<style scoped>
.view {
  display: grid;
  gap: 2rem;
}

.view__header h1 {
  margin: 0;
}

.view__header p {
  margin: 0;
  color: color-mix(in srgb, var(--color-text) 80%, transparent);
}

.preferences-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}
</style>
