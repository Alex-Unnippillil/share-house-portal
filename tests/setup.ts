import "@testing-library/jest-dom/vitest"
import React from "react"

// Ensure React is available globally for components compiled with the old JSX runtime
// used by Next.js server/client components during testing.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).React = React

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Provide a minimal ResizeObserver implementation used by Radix UI components.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).ResizeObserver = ResizeObserver
