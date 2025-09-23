"use client"

import * as React from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase-browser"

const STORAGE_KEY = "roomsily.consent-preferences"

type ConsentCategory = "necessary" | "analytics" | "marketing"

export type ConsentPreferences = Record<ConsentCategory, boolean>

const defaultPreferences: ConsentPreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
}

interface ConsentManagerContextValue {
  preferences: ConsentPreferences
  isReady: boolean
  isModalOpen: boolean
  setModalOpen: (open: boolean) => void
  openManager: () => void
  savePreferences: (preferences: ConsentPreferences) => Promise<void>
}

const ConsentManagerContext = React.createContext<ConsentManagerContextValue | null>(
  null,
)

function normalizePreferences(
  preferences: Partial<ConsentPreferences> | null | undefined,
): ConsentPreferences | null {
  if (!preferences || typeof preferences !== "object") {
    return null
  }

  const hasAnalytics = Object.prototype.hasOwnProperty.call(
    preferences,
    "analytics",
  )
  const hasMarketing = Object.prototype.hasOwnProperty.call(
    preferences,
    "marketing",
  )

  if (!hasAnalytics && !hasMarketing) {
    return null
  }

  return {
    necessary: true,
    analytics: Boolean(preferences.analytics),
    marketing: Boolean(preferences.marketing),
  }
}

async function persistPreferencesToSupabase(
  preferences: ConsentPreferences,
) {
  if (typeof window === "undefined") {
    return
  }

  try {
    const supabase = createClient()
    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError || !userData?.user) {
      return
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("metadata")
      .eq("id", userData.user.id)
      .maybeSingle()

    if (profileError) {
      console.error("Failed to load consent preferences", profileError)
      return
    }

    const metadata = {
      ...((profileData?.metadata as Record<string, unknown> | null) ?? {}),
      consentPreferences: preferences,
    }

    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert({ id: userData.user.id, metadata }, { onConflict: "id" })

    if (upsertError) {
      console.error("Failed to persist consent preferences", upsertError)
    }
  } catch (error) {
    console.error("Unexpected error while storing consent preferences", error)
  }
}

export function ConsentManagerProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [preferences, setPreferences] = React.useState<ConsentPreferences>(
    defaultPreferences,
  )
  const [isReady, setIsReady] = React.useState(false)
  const [isModalOpen, setIsModalOpen] = React.useState(false)

  React.useEffect(() => {
    let isMounted = true

    const loadPreferences = async () => {
      let storedPreferences: ConsentPreferences | null = null
      let shouldOpenModal = true

      if (typeof window !== "undefined") {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as Partial<ConsentPreferences>
            const normalized = normalizePreferences(parsed)
            if (normalized) {
              storedPreferences = normalized
              shouldOpenModal = false
            }
          } catch (error) {
            console.error("Failed to parse stored consent preferences", error)
          }
        }
      }

      if (typeof window !== "undefined" && !storedPreferences) {
        try {
          const supabase = createClient()
          const { data: userData, error: userError } = await supabase.auth.getUser()

          if (!userError && userData?.user) {
            const { data: profileData, error: profileError } = await supabase
              .from("profiles")
              .select("metadata")
              .eq("id", userData.user.id)
              .maybeSingle()

            if (!profileError) {
              const remote = normalizePreferences(
                (profileData?.metadata as Record<string, unknown> | null)
                  ?.consentPreferences as Partial<ConsentPreferences> | null,
              )

              if (remote) {
                storedPreferences = remote
                shouldOpenModal = false

                window.localStorage.setItem(
                  STORAGE_KEY,
                  JSON.stringify(remote),
                )
              }
            } else {
              console.error(
                "Failed to load consent preferences from Supabase",
                profileError,
              )
            }
          }
        } catch (error) {
          console.error(
            "Unexpected error while loading consent preferences",
            error,
          )
        }
      }

      if (!isMounted) {
        return
      }

      setPreferences(storedPreferences ?? defaultPreferences)
      setIsModalOpen(shouldOpenModal)
      setIsReady(true)
    }

    void loadPreferences()

    return () => {
      isMounted = false
    }
  }, [])

  const savePreferences = React.useCallback(
    async (next: ConsentPreferences) => {
      const normalized: ConsentPreferences = {
        necessary: true,
        analytics: Boolean(next.analytics),
        marketing: Boolean(next.marketing),
      }

      setPreferences(normalized)

      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
      }

      await persistPreferencesToSupabase(normalized)
      setIsModalOpen(false)
    },
    [],
  )

  const value = React.useMemo<ConsentManagerContextValue>(
    () => ({
      preferences,
      isReady,
      isModalOpen,
      setModalOpen: setIsModalOpen,
      openManager: () => setIsModalOpen(true),
      savePreferences,
    }),
    [isModalOpen, isReady, preferences, savePreferences],
  )

  return (
    <ConsentManagerContext.Provider value={value}>
      {children}
    </ConsentManagerContext.Provider>
  )
}

export function useConsentManager() {
  const context = React.useContext(ConsentManagerContext)

  if (!context) {
    throw new Error(
      "useConsentManager must be used within a ConsentManagerProvider",
    )
  }

  return context
}

export function ConsentManagerModal() {
  const { isReady, preferences, isModalOpen, setModalOpen, savePreferences } =
    useConsentManager()
  const [draftPreferences, setDraftPreferences] = React.useState<ConsentPreferences>(
    preferences,
  )

  React.useEffect(() => {
    if (isModalOpen) {
      setDraftPreferences(preferences)
    }
  }, [isModalOpen, preferences])

  const handleSave = React.useCallback(() => {
    return savePreferences(draftPreferences)
  }, [draftPreferences, savePreferences])

  const handleAcceptAll = React.useCallback(() => {
    return savePreferences({
      necessary: true,
      analytics: true,
      marketing: true,
    })
  }, [savePreferences])

  const handleRejectNonEssential = React.useCallback(() => {
    return savePreferences({
      necessary: true,
      analytics: false,
      marketing: false,
    })
  }, [savePreferences])

  if (!isReady) {
    return null
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={setModalOpen}>
      <DialogContent data-testid="consent-manager">
        <DialogHeader>
          <DialogTitle>Privacy preferences</DialogTitle>
          <DialogDescription>
            Choose how we can use cookies and similar technologies to improve
            your experience. You can update your preferences at any time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="necessary">Necessary</Label>
              <p className="text-sm text-muted-foreground">
                Required for core functionality such as security and network
                management. Always on.
              </p>
            </div>
            <Switch id="necessary" checked disabled aria-readonly aria-label="Necessary cookies" />
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="analytics">Analytics</Label>
              <p className="text-sm text-muted-foreground">
                Helps us understand how residents use the portal so we can
                improve performance and usability.
              </p>
            </div>
            <Switch
              id="analytics"
              role="switch"
              checked={draftPreferences.analytics}
              onCheckedChange={(value) =>
                setDraftPreferences((current) => ({
                  ...current,
                  analytics: value,
                }))
              }
              aria-label="Analytics cookies"
            />
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="marketing">Marketing</Label>
              <p className="text-sm text-muted-foreground">
                Enables personalised offers and communications from trusted
                partners.
              </p>
            </div>
            <Switch
              id="marketing"
              role="switch"
              checked={draftPreferences.marketing}
              onCheckedChange={(value) =>
                setDraftPreferences((current) => ({
                  ...current,
                  marketing: value,
                }))
              }
              aria-label="Marketing cookies"
            />
          </div>
        </div>

        <DialogFooter className="space-y-2 sm:space-y-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void handleRejectNonEssential()
            }}
          >
            Reject non-essential
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              void handleAcceptAll()
            }}
          >
            Accept all
          </Button>
          <Button
            type="button"
            onClick={() => {
              void handleSave()
            }}
          >
            Save preferences
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
