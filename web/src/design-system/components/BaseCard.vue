<template>
  <section class="ds-card" :aria-labelledby="headingId">
    <header v-if="hasHeader" class="ds-card__header">
      <slot name="header" :heading-id="headingId" />
    </header>
    <div class="ds-card__body">
      <slot />
    </div>
    <footer v-if="hasFooter" class="ds-card__footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue"

const props = withDefaults(
  defineProps<{
    headingId?: string
  }>(),
  {
    headingId: undefined,
  }
)

const slots = defineSlots<{
  header?: (props: { headingId?: string }) => unknown
  default?: () => unknown
  footer?: () => unknown
}>()

const hasHeader = computed(() => Boolean(slots.header))
const hasFooter = computed(() => Boolean(slots.footer))
const headingId = computed(() => props.headingId)
</script>

<style scoped>
.ds-card {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid color-mix(in srgb, var(--color-outline) 80%, transparent);
  box-shadow: var(--shadow-md);
  padding: 1.5rem;
  display: grid;
  gap: 1.25rem;
  color: var(--color-text);
}

.ds-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.ds-card__body {
  display: grid;
  gap: 0.75rem;
  color: inherit;
}

.ds-card__footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}
</style>
