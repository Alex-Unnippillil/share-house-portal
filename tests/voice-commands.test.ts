import { describe, expect, it, vi } from "vitest"

import { mapTranscriptToIntent } from "@/lib/voice/voice-intents"
import {
  startListening,
  type SpeechRecognitionLike,
} from "@/lib/voice/voice-service"

const navItems = [
  { title: "Payments", href: "/payments" },
  { title: "Documents", href: "/documents" },
  { title: "Messaging", href: "/messaging" },
]

describe("voice command intent mapping", () => {
  it("detects navigation intents for known destinations", () => {
    const intent = mapTranscriptToIntent("Open the payments portal", { navItems })

    expect(intent).toMatchObject({ type: "navigate", href: "/payments" })
  })

  it("detects search intents when prefixed with search verbs", () => {
    const intent = mapTranscriptToIntent("Search for maintenance updates", { navItems })

    expect(intent).toMatchObject({ type: "search", query: "maintenance updates" })
  })

  it("returns unknown when no intent can be resolved", () => {
    const intent = mapTranscriptToIntent("Bring me coffee", { navItems })

    expect(intent).toMatchObject({ type: "unknown" })
  })
})

class MockRecognition implements SpeechRecognitionLike {
  start = vi.fn(() => {
    // simulate async readiness
    return undefined
  })
  stop = vi.fn(() => {
    this.onend?.()
    return undefined
  })
  abort = vi.fn()
  lang = ""
  interimResults = false
  maxAlternatives = 0
  onresult: ((event: any) => void) | null = null
  onerror: ((event: any) => void) | null = null
  onend: (() => void) | null = null

  emit(transcript: string) {
    this.onresult?.({ results: [{ 0: { transcript } }] })
  }
}

describe("voice command speech service", () => {
  it("notifies listeners when microphone permission is denied", async () => {
    const permissionDenied = vi.fn()
    const errors = vi.fn()

    const result = await startListening({
      recognitionFactory: () => new MockRecognition(),
      requestMicrophone: () => Promise.reject({ name: "NotAllowedError" }),
      onResult: vi.fn(),
      onPermissionDenied: permissionDenied,
      onError: errors,
    })

    expect(result.started).toBe(false)
    expect(permissionDenied).toHaveBeenCalledTimes(1)
    expect(errors).not.toHaveBeenCalled()
  })

  it("forwards recognition transcripts to the consumer", async () => {
    const recognition = new MockRecognition()
    const recognitionFactory = vi.fn(() => recognition)
    const onResult = vi.fn()
    const onStart = vi.fn()
    const onEnd = vi.fn()

    const result = await startListening({
      recognitionFactory,
      requestMicrophone: () => Promise.resolve(),
      onResult,
      onStart,
      onEnd,
      onError: vi.fn(),
    })

    expect(result.started).toBe(true)
    expect(recognitionFactory).toHaveBeenCalled()
    expect(onStart).toHaveBeenCalled()
    expect(recognition.lang).toBe("en-US")

    recognition.emit("Navigate to messaging")
    expect(onResult).toHaveBeenCalledWith("Navigate to messaging")

    result.stop?.()
    expect(recognition.stop).toHaveBeenCalled()
    expect(onEnd).toHaveBeenCalled()
  })

  it("reports when speech recognition is unsupported", async () => {
    const onError = vi.fn()

    const result = await startListening({
      recognitionFactory: () => null,
      requestMicrophone: () => Promise.resolve(),
      onResult: vi.fn(),
      onError,
    })

    expect(result.started).toBe(false)
    expect(onError).toHaveBeenCalledWith("Speech recognition not supported.")
  })
})
