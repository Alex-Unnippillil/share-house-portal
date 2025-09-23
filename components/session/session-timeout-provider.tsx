"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type {
  AutoSaveCallback,
  SessionTimeoutSettings,
} from "@/lib/session/session-timeout"
import {
  calculateSessionStatus,
  extendSessionWithAutoSave,
  resolveSessionTimeoutSettings,
  toSeconds,
} from "@/lib/session/session-timeout"
import { toast } from "@/components/ui/use-toast"
import useSupabaseBrowser from "@/utils/supabase-browser"

interface SessionTimeoutContextValue {
  showWarning: boolean
  remainingSeconds: number | null
  idleSecondsRemaining: number | null
  isExtending: boolean
  extendSession: () => Promise<void>
  dismissWarning: () => void
  registerAutoSaveCallback: (callback: AutoSaveCallback) => () => void
}

const SessionTimeoutContext = createContext<SessionTimeoutContextValue | null>(null)

const DEFAULT_SETTINGS = resolveSessionTimeoutSettings(null)
const WINDOW_ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  "focus",
  "keydown",
  "mousedown",
  "mousemove",
  "touchstart",
  "scroll",
]
const VISIBILITY_EVENT: keyof DocumentEventMap = "visibilitychange"

export function SessionTimeoutProvider({ children }: { children: React.ReactNode }) {
  const supabase = useSupabaseBrowser()
  const autoSaveCallbacks = useRef(new Set<AutoSaveCallback>())
  const [expiresAtMs, setExpiresAtMs] = useState<number | null>(null)
  const [settings, setSettings] = useState<SessionTimeoutSettings>(DEFAULT_SETTINGS)
  const [lastActivityMs, setLastActivityMs] = useState(() => Date.now())
  const [showWarning, setShowWarning] = useState(false)
  const [isExtending, setIsExtending] = useState(false)

  const [status, setStatus] = useState(() =>
    calculateSessionStatus({
      expiresAtMs,
      lastActivityMs,
      nowMs: Date.now(),
      settings,
    }),
  )

  useEffect(() => {
    let mounted = true

    async function bootstrapSession() {
      const { data } = await supabase.auth.getSession()
      if (!mounted) {
        return
      }

      const session = data.session ?? null
      setExpiresAtMs(session?.expires_at ? session.expires_at * 1000 : null)
      setSettings(resolveSessionTimeoutSettings(session))
      setLastActivityMs(Date.now())
    }

    bootstrapSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setExpiresAtMs(session?.expires_at ? session.expires_at * 1000 : null)
      setSettings(resolveSessionTimeoutSettings(session))
      setLastActivityMs(Date.now())
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const markActivity = () => {
      setLastActivityMs(Date.now())
    }

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        markActivity()
      }
    }

    for (const event of WINDOW_ACTIVITY_EVENTS) {
      if (event === "focus") {
        window.addEventListener(event, markActivity)
      } else if (event === "touchstart" || event === "scroll") {
        window.addEventListener(event, markActivity, { passive: true })
      } else {
        window.addEventListener(event, markActivity)
      }
    }

    document.addEventListener(VISIBILITY_EVENT, handleVisibility)

    return () => {
      for (const event of WINDOW_ACTIVITY_EVENTS) {
        if (event === "focus") {
          window.removeEventListener(event, markActivity)
        } else if (event === "touchstart" || event === "scroll") {
          window.removeEventListener(event, markActivity)
        } else {
          window.removeEventListener(event, markActivity)
        }
      }
      document.removeEventListener(VISIBILITY_EVENT, handleVisibility)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const updateStatus = () => {
      setStatus(
        calculateSessionStatus({
          expiresAtMs,
          lastActivityMs,
          nowMs: Date.now(),
          settings,
        }),
      )
    }

    updateStatus()

    const interval = window.setInterval(updateStatus, 1000)

    return () => {
      window.clearInterval(interval)
    }
  }, [expiresAtMs, lastActivityMs, settings])

  useEffect(() => {
    setShowWarning(status.shouldWarn)
  }, [status.shouldWarn])

  const extendSession = useCallback(async () => {
    if (isExtending) {
      return
    }

    setIsExtending(true)
    try {
      const result = await extendSessionWithAutoSave(autoSaveCallbacks.current, () =>
        supabase.auth.refreshSession(),
      )

      const { data, error } = result as Awaited<ReturnType<typeof supabase.auth.refreshSession>>

      if (error) {
        throw error
      }

      const session = data.session ?? null
      setExpiresAtMs(session?.expires_at ? session.expires_at * 1000 : null)
      setSettings(resolveSessionTimeoutSettings(session))
      setLastActivityMs(Date.now())
      setShowWarning(false)
      toast({
        title: "Session extended",
        description: "We saved your changes and refreshed your session.",
      })
    } catch (error) {
      console.error("Failed to extend session", error)
      toast({
        variant: "destructive",
        title: "Unable to extend session",
        description:
          error instanceof Error
            ? error.message
            : "Refreshing your session failed. Please sign in again.",
      })
    } finally {
      setIsExtending(false)
    }
  }, [isExtending, supabase])

  const dismissWarning = useCallback(() => {
    setShowWarning(false)
    setLastActivityMs(Date.now())
  }, [])

  const registerAutoSaveCallback = useCallback((callback: AutoSaveCallback) => {
    autoSaveCallbacks.current.add(callback)
    return () => {
      autoSaveCallbacks.current.delete(callback)
    }
  }, [])

  const remainingSeconds = toSeconds(status.msUntilExpiry)
  const idleSecondsRemaining = toSeconds(status.msUntilIdleLogout)

  const secondsUntilTimeout = Math.min(
    idleSecondsRemaining ?? Number.POSITIVE_INFINITY,
    remainingSeconds ?? Number.POSITIVE_INFINITY,
  )

  const normalizedSeconds =
    Number.isFinite(secondsUntilTimeout) &&
    secondsUntilTimeout !== Number.POSITIVE_INFINITY
      ? Math.max(Math.floor(secondsUntilTimeout), 0)
      : null
  const safeSeconds = normalizedSeconds !== null ? Math.max(normalizedSeconds, 1) : null

  let formattedTime: string | null = null
  if (safeSeconds !== null) {
    if (safeSeconds >= 60) {
      const minutes = Math.ceil(safeSeconds / 60)
      formattedTime = `${minutes} minute${minutes === 1 ? "" : "s"}`
    } else {
      formattedTime = `${safeSeconds} second${safeSeconds === 1 ? "" : "s"}`
    }
  }

  const dialogDescription = formattedTime
    ? `You've been idle for a while. We'll sign you out in ${formattedTime}. Select Extend session so we can save your changes and refresh your access.`
    : "Your session is about to expire due to inactivity. Select Extend session so we can save your changes and refresh your access."

  const contextValue = useMemo<SessionTimeoutContextValue>(
    () => ({
      showWarning,
      remainingSeconds,
      idleSecondsRemaining,
      isExtending,
      extendSession,
      dismissWarning,
      registerAutoSaveCallback,
    }),
    [
      dismissWarning,
      extendSession,
      idleSecondsRemaining,
      isExtending,
      registerAutoSaveCallback,
      remainingSeconds,
      showWarning,
    ],
  )

  return (
    <SessionTimeoutContext.Provider value={contextValue}>
      {children}
      <AlertDialog open={showWarning} onOpenChange={(open) => (!open ? dismissWarning() : null)}>
        <AlertDialogContent
          className={cn(
            "sm:max-w-[420px]",
            "bg-background text-foreground",
            "border border-border",
          )}
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <AlertDialogTitle>We&apos;ll sign you out soon</AlertDialogTitle>
          <AlertDialogDescription>{dialogDescription}</AlertDialogDescription>
          <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={dismissWarning}
              disabled={isExtending}
              type="button"
            >
              Keep working
            </Button>
            <Button onClick={extendSession} disabled={isExtending} type="button">
              {isExtending ? "Extending…" : "Extend session"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SessionTimeoutContext.Provider>
  )
}

export function useSessionTimeoutContext() {
  const context = useContext(SessionTimeoutContext)

  if (!context) {
    throw new Error("useSessionTimeoutContext must be used within SessionTimeoutProvider")
  }

  return context
}
