import React from "react"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { InteractiveMdxArticle } from "@/components/mdx/interactive-article"
import { TTS_PREFERENCE_STORAGE_KEY } from "@/lib/settings/tts"

const speakMock = vi.fn()
const cancelMock = vi.fn()
const pauseMock = vi.fn()
const resumeMock = vi.fn()
const addEventListenerMock = vi.fn()
const removeEventListenerMock = vi.fn()

let voices: SpeechSynthesisVoice[] = []

const setSelection = (element: HTMLElement, start = 0, end?: number) => {
  const selection = window.getSelection()
  if (!selection) {
    return
  }

  const range = document.createRange()
  const textNode = element.firstChild
  const length = textNode?.textContent?.length ?? 0
  range.setStart(textNode ?? element, start)
  range.setEnd(textNode ?? element, end ?? length)

  selection.removeAllRanges()
  selection.addRange(range)
}

beforeEach(() => {
  voices = [
    {
      voiceURI: "roomsily-preferred",
      name: "Preferred Voice",
      lang: "en-US",
      localService: true,
      default: false,
    } as SpeechSynthesisVoice,
  ]

  Object.defineProperty(window, "speechSynthesis", {
    value: {
      speak: speakMock,
      cancel: cancelMock,
      pause: pauseMock,
      resume: resumeMock,
      getVoices: () => voices,
      addEventListener: addEventListenerMock,
      removeEventListener: removeEventListenerMock,
    },
    configurable: true,
  })

  class MockUtterance {
    text: string
    rate: number
    voice: SpeechSynthesisVoice | null
    onend: (() => void) | null
    onerror: (() => void) | null

    constructor(text: string) {
      this.text = text
      this.rate = 1
      this.voice = null
      this.onend = null
      this.onerror = null
    }
  }

  vi.stubGlobal("SpeechSynthesisUtterance", MockUtterance)
  window.localStorage.clear()
  speakMock.mockReset()
  cancelMock.mockReset()
  pauseMock.mockReset()
  resumeMock.mockReset()
  addEventListenerMock.mockReset()
  removeEventListenerMock.mockReset()
})

afterEach(() => {
  cleanup()
})

afterAll(() => {
  vi.unstubAllGlobals()
  // @ts-expect-error - cleanup mock speech synthesis
  delete window.speechSynthesis
})

describe("InteractiveMdxArticle", () => {
  it("renders TTS controls and preference summary", async () => {
    window.localStorage.setItem(
      TTS_PREFERENCE_STORAGE_KEY,
      JSON.stringify({ voiceURI: "roomsily-preferred", rate: 1.25 }),
    )

    render(
      <InteractiveMdxArticle className="prose">
        <p>Roomsily privacy overview content.</p>
      </InteractiveMdxArticle>,
    )

    const listenButton = screen.getByRole("button", { name: /listen/i })
    const pauseButton = screen.getByRole("button", { name: /pause/i })
    const resumeButton = screen.getByRole("button", { name: /resume/i })
    const stopButton = screen.getByRole("button", { name: /stop/i })

    expect(listenButton).toBeTruthy()
    expect(pauseButton).toBeTruthy()
    expect(resumeButton).toBeTruthy()
    expect(stopButton).toBeTruthy()

    const status = screen.getByRole("status")
    await waitFor(() => {
      expect(status.textContent).toContain("Preferred Voice")
      expect(status.textContent).toContain("1.25")
    })
  })

  it("speaks when selection is inside the MDX article", async () => {
    window.localStorage.setItem(
      TTS_PREFERENCE_STORAGE_KEY,
      JSON.stringify({ voiceURI: "roomsily-preferred", rate: 1.6 }),
    )

    render(
      <InteractiveMdxArticle className="prose">
        <p>Select this body copy for narration.</p>
      </InteractiveMdxArticle>,
    )

    const article = screen.getByRole("article") as HTMLElement
    await waitFor(() => {
      const status = screen.getByRole("status")
      expect(status.textContent).toContain("Preferred Voice")
    })

    setSelection(article.querySelector("p") as HTMLElement)
    const listenButton = screen.getByRole("button", { name: /listen/i })
    fireEvent.click(listenButton)

    expect(speakMock).toHaveBeenCalledTimes(1)
    const utterance = speakMock.mock.calls[0][0] as SpeechSynthesisUtterance & {
      rate: number
      voice: SpeechSynthesisVoice | null
    }

    expect(utterance.text).toContain("Select this body copy for narration")
    expect(utterance.rate).toBeCloseTo(1.6)
    expect(utterance.voice?.voiceURI).toBe("roomsily-preferred")
  })

  it("prevents narration outside of the article selection", async () => {
    render(
      <InteractiveMdxArticle className="prose">
        <p>Only this text should be read aloud.</p>
      </InteractiveMdxArticle>,
    )

    const outside = document.createElement("p")
    outside.textContent = "Outside selection should not trigger narration."
    document.body.appendChild(outside)

    await waitFor(() => {
      const status = screen.getByRole("status")
      expect(status.textContent).toContain("Voice")
    })

    setSelection(outside)
    const listenButton = screen.getByRole("button", { name: /listen/i })
    fireEvent.click(listenButton)

    expect(speakMock).not.toHaveBeenCalled()
    const status = screen.getByRole("status")
    expect(status.textContent).toContain("limited to the article content")

    outside.remove()
  })
})
