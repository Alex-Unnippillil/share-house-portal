<template>
  <label class="preferences-field">
    <span class="preferences-field__label">{{
      t("preferences.language")
    }}</span>
    <select
      class="preferences-field__select"
      :value="preferences.locale"
      @change="onChange"
    >
      <option
        v-for="localeOption in preferences.availableLocales"
        :key="localeOption.code"
        :value="localeOption.code"
      >
        {{ localeOption.label }}
      </option>
    </select>
  </label>
</template>

<script setup lang="ts">
import { usePreferencesStore, type LocaleCode } from "@/stores/preferences"
import { onMounted } from "vue"
import { useI18n } from "vue-i18n"

const { t, locale } = useI18n()
const preferences = usePreferencesStore()

onMounted(() => {
  preferences.hydrate()
})

function onChange(event: Event) {
  const target = event.target as HTMLSelectElement
  const nextLocale = target.value as LocaleCode
  preferences.setLocale(nextLocale)
  locale.value = nextLocale
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
