<template>
  <footer class="app-footer">
    <p class="app-footer__copy">
      &copy; {{ currentYear }} {{ t("app.title") }}
    </p>
    <div class="app-footer__links">
      <BaseLink href="https://a11yproject.com" variant="muted">
        Accessibility resources
      </BaseLink>
      <BaseLink href="https://github.com/" variant="muted"> GitHub </BaseLink>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n"

const { t } = useI18n()
const currentYear = new Date().getFullYear()
</script>

<style scoped>
.app-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem 0;
  border-top: 1px solid
    color-mix(in srgb, var(--color-outline) 70%, transparent);
  margin-top: 3rem;
  color: var(--color-text-muted);
}

.app-footer__links {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.app-footer__copy {
  margin: 0;
  font-size: 0.875rem;
}
</style>
