import "@testing-library/jest-dom/vitest"

type ResizeObserverType = typeof globalThis.ResizeObserver

declare global {
  // eslint-disable-next-line no-var
  var ResizeObserver: ResizeObserverType | undefined
  interface Window {
    ResizeObserver?: ResizeObserverType
  }
}

if (typeof window !== "undefined" && typeof window.ResizeObserver === "undefined") {
  class ResizeObserverStub {
    disconnect() {}
    observe() {}
    unobserve() {}
  }

  window.ResizeObserver = ResizeObserverStub as unknown as ResizeObserverType
  globalThis.ResizeObserver = window.ResizeObserver
}

if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {
    // noop for jsdom
  }
}
