<template>
  <a class="skip-link" href="#main-content">
    {{ label }}
  </a>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string
  }>(),
  {
    label: "Skip to main content",
  }
)
</script>
