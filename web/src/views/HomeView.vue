<template>
  <section class="view view--home">
    <header class="view__hero">
      <p class="view__eyebrow">{{ t("app.tagline") }}</p>
      <h1 class="view__title">
        {{ t("home.welcome", { name: auth.user?.name ?? t("auth.guest") }) }}
      </h1>
      <p class="view__description">
        {{ t("home.intro") }}
      </p>
      <div class="view__actions">
        <BaseButton @click="handlePrimaryCta">{{ t("home.cta") }}</BaseButton>
        <BaseLink to="/settings" variant="muted">
          {{ t("navigation.settings") }}
        </BaseLink>
      </div>
    </header>

    <div class="view__grid">
      <BaseCard>
        <template #header>
          <div class="card-header">
            <h2 id="dashboard-overview">Household health</h2>
            <span class="badge badge--positive">Live</span>
          </div>
        </template>
        <p>
          Track outstanding chores, upcoming rent, and supply restocks at a
          glance. Automated reminders keep everyone aligned.
        </p>
        <ul class="stat-list">
          <li>
            <span class="stat-list__label">Outstanding tasks</span>
            <span class="stat-list__value">{{ outstandingTasks }}</span>
          </li>
          <li>
            <span class="stat-list__label">Next rent transfer</span>
            <span class="stat-list__value">{{ nextRentDue }}</span>
          </li>
        </ul>
      </BaseCard>

      <BaseCard>
        <template #header>
          <div class="card-header">
            <h2 id="communications">Communications</h2>
          </div>
        </template>
        <p>
          Shared announcements sync to email and SMS so housemates stay in the
          loop. Draft updates and schedule when they send.
        </p>
        <BaseButton variant="secondary">Compose message</BaseButton>
      </BaseCard>

      <BaseCard>
        <template #header>
          <div class="card-header">
            <h2 id="automations">Automations</h2>
          </div>
        </template>
        <p>
          Connect rent collection, cleaning rotations, and grocery budgets with
          automations. Start with presets and fine-tune later.
        </p>
        <BaseLink href="https://vitejs.dev/guide/" variant="muted">
          Browse automation examples
        </BaseLink>
      </BaseCard>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useAuthStore } from "@/stores/auth"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()

const outstandingTasks = computed(() => (auth.isAuthenticated ? 3 : 0))
const nextRentDue = computed(() =>
  auth.isAuthenticated ? "In 4 days" : "Invite residents"
)

function handlePrimaryCta() {
  router.push({ name: "settings" })
}
</script>

<style scoped>
.view {
  display: grid;
  gap: 2rem;
}

.view__hero {
  display: grid;
  gap: 1rem;
}

.view__eyebrow {
  font-size: 0.875rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin: 0;
}

.view__title {
  font-size: clamp(2rem, 4vw, 2.75rem);
  margin: 0;
  color: var(--color-text);
}

.view__description {
  font-size: 1.1rem;
  margin: 0;
  max-width: 52ch;
  color: color-mix(in srgb, var(--color-text) 80%, transparent);
}

.view__actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.view__grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.card-header h2 {
  margin: 0;
  font-size: 1.25rem;
}

.stat-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.75rem;
}

.stat-list__label {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.stat-list__value {
  font-size: 1.25rem;
  font-weight: 700;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  border-radius: var(--radius-pill, 999px);
  padding: 0.2rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge--positive {
  background-color: color-mix(in srgb, var(--color-success) 20%, transparent);
  color: var(--color-success);
}

@media (max-width: 700px) {
  .view__actions {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
