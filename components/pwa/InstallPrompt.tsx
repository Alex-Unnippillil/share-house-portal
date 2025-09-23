"use client"

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { Download } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface BeforeInstallPromptEvent extends Event {
  readonly platforms?: string[]
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

interface InstallPromptContextValue {
  canInstall: boolean
  promptInstall: () => Promise<void>
}

const InstallPromptContext = createContext<InstallPromptContextValue | undefined>(
  undefined,
)

const SESSION_STORAGE_KEY = "roomsily:pwa-install:prompted"
const ACCEPTANCE_STATS_KEY = "roomsily:pwa-install:stats"

function logInstallOutcome(outcome: "accepted" | "dismissed") {
  if (typeof window === "undefined") {
    return
  }

  try {
    const raw = window.localStorage.getItem(ACCEPTANCE_STATS_KEY)
    const stats: { accepted: number; dismissed: number } = raw
      ? JSON.parse(raw)
      : { accepted: 0, dismissed: 0 }

    stats[outcome] += 1
    window.localStorage.setItem(ACCEPTANCE_STATS_KEY, JSON.stringify(stats))

    const total = stats.accepted + stats.dismissed
    const acceptanceRate = total === 0 ? 0 : (stats.accepted / total) * 100

    console.info(
      `[PWA] Install prompt ${outcome}. Acceptance rate ${acceptanceRate.toFixed(
        1,
      )}% (${stats.accepted}/${total}).`,
    )
  } catch (error) {
    console.info(`[PWA] Install prompt ${outcome}.`)
  }
}

export function InstallPromptProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [isAvailable, setIsAvailable] = useState(false)

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      if (typeof window === "undefined") {
        return
      }

      let hasPromptedThisSession = false

      try {
        hasPromptedThisSession =
          window.sessionStorage.getItem(SESSION_STORAGE_KEY) === "true"
      } catch (error) {
        console.warn("[PWA] Unable to access sessionStorage for install prompt.", error)
      }

      if (hasPromptedThisSession) {
        return
      }

      const installEvent = event as BeforeInstallPromptEvent

      if (typeof installEvent.prompt !== "function") {
        return
      }

      event.preventDefault()
      setDeferredPrompt(installEvent)
      setIsAvailable(true)

      try {
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, "true")
      } catch (error) {
        console.warn("[PWA] Unable to persist session install prompt state.", error)
      }
    }

    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setIsAvailable(false)
      console.info("[PWA] App installed event detected.")
    }

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt as EventListener,
    )
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt as EventListener,
      )
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      return
    }

    try {
      await deferredPrompt.prompt()

      const choice = await deferredPrompt.userChoice.catch(() => null)
      if (choice?.outcome === "accepted" || choice?.outcome === "dismissed") {
        logInstallOutcome(choice.outcome)
      }
    } catch (error) {
      console.error("[PWA] Failed to trigger install prompt.", error)
    } finally {
      setDeferredPrompt(null)
      setIsAvailable(false)
    }
  }, [deferredPrompt])

  const value = useMemo<InstallPromptContextValue>(
    () => ({
      canInstall: isAvailable && deferredPrompt !== null,
      promptInstall,
    }),
    [isAvailable, deferredPrompt, promptInstall],
  )

  return (
    <InstallPromptContext.Provider value={value}>
      {children}
    </InstallPromptContext.Provider>
  )
}

export function useInstallPrompt() {
  const context = useContext(InstallPromptContext)

  if (!context) {
    throw new Error("useInstallPrompt must be used within InstallPromptProvider")
  }

  return context
}

export function InstallPromptCta({ className }: { className?: string }) {
  const { canInstall, promptInstall } = useInstallPrompt()

  if (!canInstall) {
    return null
  }

  return (
    <button
      type="button"
      onClick={() => {
        void promptInstall()
      }}
      className={cn(buttonVariants({ size: "sm" }), "gap-2", className)}
      data-testid="pwa-install-cta"
    >
      <Download aria-hidden="true" className="size-4" />
      <span>Install app</span>
    </button>
  )
}
