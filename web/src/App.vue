<template>
  <AppShell>
    <div class="app-container">
      <RouterView />
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { RouterView } from "vue-router"

import AppShell from "@/app/AppShell.vue"
</script>

<style scoped>
.app-container {
  width: min(100%, var(--layout-max-width));
  margin: 0 auto;
  padding: 0 1.5rem;
}
</style>
