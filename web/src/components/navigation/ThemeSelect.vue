<template>
  <label class="preferences-field">
    <span class="preferences-field__label">{{ t("preferences.theme") }}</span>
    <select
      class="preferences-field__select"
      :value="colorScheme"
      @change="onChange"
    >
      <option value="system">{{ t("preferences.themeSystem") }}</option>
      <option value="light">{{ t("preferences.themeLight") }}</option>
      <option value="dark">{{ t("preferences.themeDark") }}</option>
    </select>
  </label>
</template>

<script setup lang="ts">
import { useColorMode } from "@/composables/useColorMode"
import { useI18n } from "vue-i18n"

const { t } = useI18n()
const { colorScheme } = useColorMode()

function onChange(event: Event) {
  const target = event.target as HTMLSelectElement
  colorScheme.value = target.value as typeof colorScheme.value
}
</script>

<style scoped>
.preferences-field {
  display: grid;
  gap: 0.25rem;
}

.preferences-field__label {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.preferences-field__select {
  appearance: none;
  border-radius: var(--radius-md);
  padding: 0.5rem 0.75rem;
  border: 1px solid color-mix(in srgb, var(--color-outline) 75%, transparent);
  background-color: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-sm);
}

.preferences-field__select:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--color-primary) 45%, transparent);
  outline-offset: 2px;
}
</style>
