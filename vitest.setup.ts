import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})

HTMLCanvasElement.prototype.getContext = () => null

class ResizeObserverStub {
  observe() {
    // no-op for tests
  }
  unobserve() {
    // no-op for tests
  }
  disconnect() {
    // no-op for tests
  }
}

if (typeof window !== 'undefined') {
  // @ts-expect-error test environment polyfill
  window.ResizeObserver = ResizeObserverStub
}
// @ts-expect-error test environment polyfill
global.ResizeObserver = ResizeObserverStub
