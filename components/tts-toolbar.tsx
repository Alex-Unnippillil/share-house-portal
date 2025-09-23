"use client"

import * as React from "react"

import { useTtsPreferences } from "@/hooks/use-tts-preferences"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type TtsToolbarProps = {
  containerRef: React.RefObject<HTMLElement>
  className?: string
}

type SelectionIssue = "empty" | "outside" | "unsupported"
type SpeechStatus = "idle" | "speaking" | "paused"

const STATUS_MESSAGES: Record<SelectionIssue, string> = {
  empty: "Highlight text within this page to listen to it.",
  outside: "Text-to-speech is limited to the article content shown here.",
  unsupported: "Text-to-speech is unavailable in this browser.",
}

const resolveNode = (node: Node | null) => {
  if (!node) {
    return null
  }

  return node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element)
}

export function TtsToolbar({ containerRef, className }: TtsToolbarProps) {
  const { preferences } = useTtsPreferences()
  const [voices, setVoices] = React.useState<SpeechSynthesisVoice[]>([])
  const [status, setStatus] = React.useState<SpeechStatus>("idle")
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null)
  const [isSupported, setIsSupported] = React.useState(false)

  React.useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setIsSupported(false)
      return
    }

    setIsSupported(true)

    const synth = window.speechSynthesis
    const updateVoices = () => {
      const availableVoices = synth.getVoices()
      setVoices(availableVoices)
    }

    updateVoices()
    synth.addEventListener("voiceschanged", updateVoices)

    return () => {
      synth.removeEventListener("voiceschanged", updateVoices)
    }
  }, [])

  React.useEffect(() => {
    if (!isSupported) {
      return
    }

    return () => {
      window.speechSynthesis.cancel()
    }
  }, [isSupported])

  const preferredVoice = React.useMemo(() => {
    if (!voices.length) {
      return null
    }

    if (preferences.voiceURI) {
      const matched = voices.find((voice) => voice.voiceURI === preferences.voiceURI)
      if (matched) {
        return matched
      }
    }

    return voices[0] ?? null
  }, [preferences.voiceURI, voices])

  const describePreferences = React.useMemo(() => {
    const voiceName = preferredVoice?.name ?? "Browser default"
    const rate = preferences.rate.toFixed(2)
    return `Voice: ${voiceName} • Speed: ${rate}x`
  }, [preferences.rate, preferredVoice?.name])

  const resolveSelection = React.useCallback(() => {
    const container = containerRef.current
    if (!container || typeof window === "undefined") {
      return { text: "", valid: false, issue: "empty" as SelectionIssue }
    }

    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) {
      return { text: "", valid: false, issue: "empty" as SelectionIssue }
    }

    const anchorElement = resolveNode(selection.anchorNode)
    const focusElement = resolveNode(selection.focusNode)

    if (!anchorElement || !focusElement) {
      return { text: "", valid: false, issue: "empty" as SelectionIssue }
    }

    if (!container.contains(anchorElement) || !container.contains(focusElement)) {
      return { text: "", valid: false, issue: "outside" as SelectionIssue }
    }

    const text = selection.toString().trim()
    if (!text) {
      return { text: "", valid: false, issue: "empty" as SelectionIssue }
    }

    return { text, valid: true as const }
  }, [containerRef])

  const handleListen = React.useCallback(() => {
    setStatusMessage(null)

    if (!isSupported || typeof window === "undefined") {
      setStatusMessage(STATUS_MESSAGES.unsupported)
      return
    }

    const { text, valid, issue } = resolveSelection()

    if (!valid) {
      if (issue) {
        setStatusMessage(STATUS_MESSAGES[issue])
      }
      setStatus("idle")
      window.speechSynthesis.cancel()
      return
    }

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = preferences.rate
    if (preferredVoice) {
      utterance.voice = preferredVoice
    }

    utterance.onend = () => {
      setStatus("idle")
    }

    utterance.onerror = () => {
      setStatus("idle")
      setStatusMessage("Unable to read the selected text. Try again.")
    }

    setStatus("speaking")
    window.speechSynthesis.speak(utterance)
  }, [isSupported, preferences.rate, preferredVoice, resolveSelection])

  const handlePause = React.useCallback(() => {
    if (!isSupported || typeof window === "undefined" || status !== "speaking") {
      return
    }

    window.speechSynthesis.pause()
    setStatus("paused")
  }, [isSupported, status])

  const handleResume = React.useCallback(() => {
    if (!isSupported || typeof window === "undefined" || status !== "paused") {
      return
    }

    window.speechSynthesis.resume()
    setStatus("speaking")
  }, [isSupported, status])

  const handleStop = React.useCallback(() => {
    if (!isSupported || typeof window === "undefined") {
      return
    }

    window.speechSynthesis.cancel()
    setStatus("idle")
  }, [isSupported])

  return (
    <div className={cn("flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-4", className)}>
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleListen} type="button">
          Listen
        </Button>
        <Button disabled={status !== "speaking"} onClick={handlePause} type="button" variant="outline">
          Pause
        </Button>
        <Button disabled={status !== "paused"} onClick={handleResume} type="button" variant="outline">
          Resume
        </Button>
        <Button disabled={status === "idle"} onClick={handleStop} type="button" variant="ghost">
          Stop
        </Button>
      </div>
      <p className="text-sm text-muted-foreground" role="status">
        {statusMessage ?? describePreferences}
      </p>
    </div>
  )
}
