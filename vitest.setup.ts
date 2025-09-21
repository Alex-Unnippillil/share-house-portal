import "@testing-library/jest-dom/vitest"

// Provide minimal mock for window.matchMedia used by some shadcn components
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = () => ({
    matches: false,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
    media: "",
    onchange: null,
  }) as unknown as typeof window.matchMedia
}

if (typeof window !== "undefined" && !("ResizeObserver" in window)) {
  class ResizeObserverStub {
    observe() {
      return undefined
    }
    unobserve() {
      return undefined
    }
    disconnect() {
      return undefined
    }
  }
  // @ts-expect-error - assign stub for test environment
  window.ResizeObserver = ResizeObserverStub
}

if (typeof Element !== "undefined") {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => undefined
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => undefined
  }
}

import React from "react"

// Ensure React is globally available for components compiled with the classic runtime
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).React = React
