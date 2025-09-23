export interface SpeechRecognitionLike {
  start: () => void
  stop: () => void
  abort?: () => void
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: any) => void) | null
  onerror: ((event: any) => void) | null
  onend: (() => void) | null
}

export interface StartListeningOptions {
  recognitionFactory: () => SpeechRecognitionLike | null
  requestMicrophone: () => Promise<unknown>
  onResult: (transcript: string) => void
  onPermissionDenied?: () => void
  onStart?: () => void
  onEnd?: () => void
  onError?: (error: unknown) => void
}

export interface StartListeningResult {
  started: boolean
  stop?: () => void
}

export async function startListening({
  recognitionFactory,
  requestMicrophone,
  onResult,
  onPermissionDenied,
  onStart,
  onEnd,
  onError,
}: StartListeningOptions): Promise<StartListeningResult> {
  try {
    await requestMicrophone()
  } catch (error) {
    const isPermissionError =
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error as { name?: string }).name === "NotAllowedError"

    if (isPermissionError) {
      onPermissionDenied?.()
      return { started: false }
    }

    onError?.(error)
    return { started: false }
  }

  const recognition = recognitionFactory()
  if (!recognition) {
    onError?.("Speech recognition not supported.")
    return { started: false }
  }

  const cleanup = () => {
    recognition.onresult = null
    recognition.onerror = null
    recognition.onend = null
  }

  recognition.lang = "en-US"
  recognition.interimResults = false
  recognition.maxAlternatives = 1

  recognition.onresult = (event: any) => {
    const result = event?.results?.[0]?.[0]
    const transcript = typeof result?.transcript === "string" ? result.transcript : ""
    if (transcript) {
      onResult(transcript)
    }
  }

  recognition.onerror = (event: any) => {
    cleanup()
    onEnd?.()
    onError?.(event)
  }

  recognition.onend = () => {
    cleanup()
    onEnd?.()
  }

  try {
    onStart?.()
    recognition.start()
  } catch (error) {
    cleanup()
    onEnd?.()
    onError?.(error)
    return { started: false }
  }

  const stop = () => {
    cleanup()
    try {
      recognition.stop()
    } catch (stopError) {
      recognition.abort?.()
      onError?.(stopError)
    }
    onEnd?.()
  }

  return { started: true, stop }
}
