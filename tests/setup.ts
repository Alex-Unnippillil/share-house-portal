import "@testing-library/jest-dom/vitest"

if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = () => ({
    matches: false,
    media: "",
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })
}

if (typeof window !== "undefined" && !("ResizeObserver" in window)) {
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  // @ts-expect-error - jsdom test environment
  window.ResizeObserver = ResizeObserver
  // @ts-expect-error - jsdom test environment
  global.ResizeObserver = ResizeObserver
}
