"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Icons } from "@/components/icons"
import { useToast } from "@/components/ui/use-toast"
import { useCommandPalette } from "@/components/command-palette"
import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"
import { mapTranscriptToIntent } from "@/lib/voice/voice-intents"
import {
  startListening,
  type SpeechRecognitionLike,
} from "@/lib/voice/voice-service"

const navItems = siteConfig.mainNav.filter((item) => item.href)

export function VoiceCommandButton() {
  const { toast } = useToast()
  const { runIntent } = useCommandPalette()
  const [isListening, setIsListening] = React.useState(false)
  const stopRef = React.useRef<(() => void) | null>(null)
  const statusRef = React.useRef<HTMLSpanElement | null>(null)

  React.useEffect(() => {
    return () => {
      stopRef.current?.()
      stopRef.current = null
    }
  }, [])

  const handleTranscript = React.useCallback(
    (transcript: string) => {
      const intent = mapTranscriptToIntent(transcript, { navItems })
      runIntent(intent)

      switch (intent.type) {
        case "navigate": {
          toast({
            title: `Navigating to ${intent.label}`,
            description: intent.href,
          })
          break
        }
        case "search": {
          toast({
            title: "Search ready",
            description: `Command palette primed for “${intent.query}”.`,
          })
          break
        }
        case "unknown": {
          toast({
            title: "Command palette opened",
            description: `No direct match for “${intent.transcript}”.`,
          })
        }
      }
    },
    [runIntent, toast]
  )

  const handlePermissionDenied = React.useCallback(() => {
    toast({
      variant: "destructive",
      title: "Microphone blocked",
      description:
        "Enable microphone access in your browser to use voice commands.",
    })
  }, [toast])

  const handleError = React.useCallback(
    (error: unknown) => {
      const description =
        typeof error === "string"
          ? error
          : error && typeof error === "object" && "message" in error
            ? String((error as { message?: unknown }).message || "")
            : "Speech recognition is unavailable."

      toast({
        variant: "destructive",
        title: "Voice command error",
        description: description || "Speech recognition is unavailable.",
      })
    },
    [toast]
  )

  const requestMicrophone = React.useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      return Promise.reject(new Error("Microphone access is not supported."))
    }

    return navigator.mediaDevices.getUserMedia({ audio: true })
  }, [])

  const recognitionFactory = React.useCallback((): SpeechRecognitionLike | null => {
    if (typeof window === "undefined") {
      return null
    }

    const SpeechRecognitionCtor =
      (window as typeof window & {
        webkitSpeechRecognition?: typeof window.SpeechRecognition
      }).SpeechRecognition ||
      (window as typeof window & {
        webkitSpeechRecognition?: typeof window.SpeechRecognition
      }).webkitSpeechRecognition

    if (!SpeechRecognitionCtor) {
      return null
    }

    return new SpeechRecognitionCtor() as unknown as SpeechRecognitionLike
  }, [])

  const handleToggle = React.useCallback(async () => {
    if (isListening) {
      stopRef.current?.()
      stopRef.current = null
      setIsListening(false)
      statusRef.current?.setAttribute("data-status", "idle")
      return
    }

    const result = await startListening({
      recognitionFactory,
      requestMicrophone,
      onResult: handleTranscript,
      onPermissionDenied: handlePermissionDenied,
      onStart: () => {
        setIsListening(true)
        statusRef.current?.setAttribute("data-status", "listening")
      },
      onEnd: () => {
        setIsListening(false)
        statusRef.current?.setAttribute("data-status", "idle")
        stopRef.current = null
      },
      onError: handleError,
    })

    if (result.started && result.stop) {
      stopRef.current = result.stop
    } else {
      setIsListening(false)
      stopRef.current = null
    }
  }, [
    handleError,
    handlePermissionDenied,
    handleTranscript,
    isListening,
    recognitionFactory,
    requestMicrophone,
  ])

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className={cn(
          "relative size-9 px-0 text-muted-foreground transition-colors",
          isListening && "text-primary"
        )}
        aria-pressed={isListening}
        aria-label={isListening ? "Stop voice command" : "Start voice command"}
        onClick={handleToggle}
      >
        <span className="sr-only">
          {isListening ? "Stop voice command" : "Start voice command"}
        </span>
        <Icons.mic className="size-4" aria-hidden />
        {isListening && (
          <span
            className="absolute inset-0 animate-ping rounded-full border border-primary/30"
            aria-hidden
          />
        )}
      </Button>
      <span
        ref={statusRef}
        aria-live="polite"
        className="sr-only"
        data-status="idle"
      >
        {isListening ? "Listening for a command" : "Voice command idle"}
      </span>
    </>
  )
}
