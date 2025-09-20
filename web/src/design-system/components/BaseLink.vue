<template>
  <component
    :is="component"
    v-bind="componentProps"
    class="ds-link"
    :class="[`ds-link--${variant}`]"
  >
    <span class="ds-link__content">
      <slot />
      <span v-if="isExternal" class="ds-link__external" aria-hidden="true">
        ↗
      </span>
    </span>
  </component>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { RouterLink } from "vue-router"

type Variant = "primary" | "muted" | "contrast"

type Props =
  | {
      to: string
      href?: never
      target?: string
      rel?: string
      variant?: Variant
    }
  | {
      to?: never
      href: string
      target?: string
      rel?: string
      variant?: Variant
    }

const props = withDefaults(defineProps<Props>(), {
  variant: "primary" as Variant,
  target: undefined,
  rel: undefined,
  href: undefined,
  to: undefined,
})

const component = computed(() => (props.to ? RouterLink : "a"))
const isExternal = computed(() =>
  Boolean(props.href && /^https?:/i.test(props.href))
)

const componentProps = computed(() => {
  if (props.to) {
    return {
      to: props.to,
    }
  }

  const rel =
    props.rel ?? (isExternal.value ? "noreferrer noopener" : undefined)

  return {
    href: props.href,
    target: props.target ?? (isExternal.value ? "_blank" : undefined),
    rel,
  }
})

const variant = computed(() => props.variant ?? "primary")
</script>

<style scoped>
.ds-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-weight: 600;
  text-decoration: none;
  color: var(--color-primary);
  transition: color 0.2s ease;
}

.ds-link:hover,
.ds-link:focus-visible {
  color: var(--color-primary-emphasis);
}

.ds-link:focus-visible {
  outline: 3px solid color-mix(in srgb, currentColor 40%, transparent);
  outline-offset: 2px;
}

.ds-link--muted {
  color: var(--color-text-muted);
}

.ds-link--contrast {
  color: var(--color-on-surface);
}

.ds-link__external {
  font-size: 0.75em;
  opacity: 0.8;
}

.ds-link__content {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}
</style>
