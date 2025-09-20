import { defineStore } from "pinia"
import { computed, ref } from "vue"

const STORAGE_KEY = "share-house-portal.auth"

export type AuthUser = {
  id: string
  email: string
  name?: string
}

type PersistedAuthState = {
  token: string | null
  user: AuthUser | null
}

function readPersistedState(): PersistedAuthState | null {
  if (typeof window === "undefined") {
    return null
  }

  const serialized = window.localStorage.getItem(STORAGE_KEY)

  if (!serialized) return null

  try {
    const parsed = JSON.parse(serialized) as PersistedAuthState

    return parsed
  } catch (error) {
    console.warn("Unable to parse stored auth session", error)
    return null
  }
}

export const useAuthStore = defineStore("auth", () => {
  const token = ref<string | null>(null)
  const user = ref<AuthUser | null>(null)
  const isInitialized = ref(false)

  function persist() {
    if (typeof window === "undefined") return

    const payload: PersistedAuthState = {
      token: token.value,
      user: user.value,
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }

  function hydrate() {
    if (isInitialized.value) return

    const persisted = readPersistedState()

    if (persisted) {
      token.value = persisted.token
      user.value = persisted.user
    }

    isInitialized.value = true
  }

  function setSession(nextToken: string, profile: AuthUser) {
    token.value = nextToken
    user.value = profile
    persist()
  }

  function clearSession() {
    token.value = null
    user.value = null
    persist()
  }

  const isAuthenticated = computed(() => Boolean(token.value))

  return {
    isAuthenticated,
    isInitialized,
    token,
    user,
    clearSession,
    hydrate,
    setSession,
  }
})
