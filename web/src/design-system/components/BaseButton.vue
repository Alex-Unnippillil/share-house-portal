<template>
  <component
    :is="componentTag"
    class="ds-button"
    :class="[
      `ds-button--${variant}`,
      `ds-button--${size}`,
      { 'ds-button--loading': isLoading },
    ]"
    :aria-busy="isLoading"
    v-bind="mergedAttrs"
    @click="handleClick"
  >
    <span v-if="isLoading" class="ds-button__spinner" aria-hidden="true"></span>
    <span class="ds-button__label">
      <slot />
    </span>
  </component>
</template>

<script setup lang="ts">
import { computed, mergeProps, toRefs, useAttrs } from "vue"
import { RouterLink } from "vue-router"

const props = withDefaults(
  defineProps<{
    variant?: "primary" | "secondary" | "ghost" | "danger"
    size?: "sm" | "md" | "lg"
    isLoading?: boolean
    disabled?: boolean
    type?: "button" | "submit" | "reset"
    to?: string
    href?: string
    target?: string
    rel?: string
  }>(),
  {
    variant: "primary",
    size: "md",
    isLoading: false,
    disabled: false,
    type: "button",
    to: undefined,
    href: undefined,
    target: undefined,
    rel: undefined,
  }
)

const { variant, size, isLoading } = toRefs(props)
const attrs = useAttrs()

const componentTag = computed(() => {
  if (props.to) return RouterLink
  if (props.href) return "a"
  return "button"
})

const componentAttrs = computed(() => {
  if (props.to) {
    return {
      to: props.to,
      "aria-disabled": props.disabled || props.isLoading ? "true" : undefined,
      tabindex: props.disabled || props.isLoading ? -1 : undefined,
    }
  }

  if (props.href) {
    const isExternal = /^https?:/i.test(props.href)
    return {
      href: props.href,
      target: props.target ?? (isExternal ? "_blank" : undefined),
      rel: props.rel ?? (isExternal ? "noreferrer noopener" : undefined),
      "aria-disabled": props.disabled || props.isLoading ? "true" : undefined,
      tabindex: props.disabled || props.isLoading ? -1 : undefined,
    }
  }

  return {
    type: props.type,
    disabled: props.disabled || props.isLoading,
  }
})

const mergedAttrs = computed(() => mergeProps(attrs, componentAttrs.value))

function handleClick(event: Event) {
  if (props.disabled || props.isLoading) {
    event.preventDefault()
    event.stopImmediatePropagation()
  }
}
</script>

<style scoped>
.ds-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font: inherit;
  font-weight: 600;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  padding: 0.55rem 1.25rem;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease,
    color 0.2s ease, transform 0.2s ease;
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  min-height: 2.5rem;
  text-decoration: none;
}

.ds-button:hover:not(:disabled) {
  background-color: var(--color-primary-emphasis);
  transform: translateY(-1px);
}

.ds-button:active:not(:disabled) {
  transform: translateY(0);
}

.ds-button:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--color-primary) 40%, transparent);
  outline-offset: 2px;
}

.ds-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ds-button[aria-disabled="true"] {
  opacity: 0.6;
  pointer-events: none;
}

.ds-button--secondary {
  background-color: var(--color-surface);
  border-color: color-mix(in srgb, var(--color-outline) 80%, transparent);
  color: var(--color-text);
}

.ds-button--secondary:hover:not(:disabled) {
  background-color: color-mix(
    in srgb,
    var(--color-surface) 70%,
    var(--color-primary) 30%
  );
}

.ds-button--ghost {
  background-color: transparent;
  color: var(--color-text-muted);
}

.ds-button--ghost:hover:not(:disabled) {
  background-color: color-mix(in srgb, var(--color-surface) 60%, transparent);
  color: var(--color-text);
}

.ds-button--danger {
  background-color: var(--color-danger);
  color: var(--color-on-danger);
}

.ds-button--danger:hover:not(:disabled) {
  background-color: var(--color-danger-emphasis);
}

.ds-button--sm {
  border-radius: var(--radius-sm);
  padding: 0.35rem 0.85rem;
  font-size: 0.875rem;
  min-height: 2.25rem;
}

.ds-button--lg {
  border-radius: var(--radius-lg);
  padding: 0.75rem 1.75rem;
  font-size: 1rem;
  min-height: 2.75rem;
}

.ds-button__spinner {
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--color-on-primary) 70%, transparent);
  border-top-color: var(--color-on-primary);
  animation: spin 0.8s linear infinite;
}

.ds-button--secondary .ds-button__spinner {
  border-color: color-mix(in srgb, var(--color-text) 40%, transparent);
  border-top-color: var(--color-text);
}

.ds-button--ghost .ds-button__spinner {
  border-color: color-mix(in srgb, currentColor 40%, transparent);
  border-top-color: currentColor;
}

.ds-button__label {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
