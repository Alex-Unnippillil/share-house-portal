<template>
  <section class="view view--not-found" aria-labelledby="not-found-heading">
    <h1 id="not-found-heading">Page not found</h1>
    <p>
      The page you're looking for doesn't exist or has moved. Use the navigation
      above or return to the overview.
    </p>
    <div class="view__actions">
      <BaseButton :to="'/'">{{ t("navigation.home") }}</BaseButton>
      <BaseLink to="/settings">{{ t("navigation.settings") }}</BaseLink>
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
  gap: 1.25rem;
  text-align: center;
  justify-items: center;
  padding: 4rem 0;
}

.view__actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
}
</style>
