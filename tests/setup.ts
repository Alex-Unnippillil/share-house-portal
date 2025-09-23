import "@testing-library/jest-dom/vitest"

if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).ResizeObserver = ResizeObserver
}

if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}
