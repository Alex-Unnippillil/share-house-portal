/**
 * Utility helper to introduce an artificial delay for simulating slow data sources.
 * The promise resolves after the provided milliseconds have elapsed.
 */
export async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Wraps a value in a resolved promise after a delay, making it convenient to
 * compose with Suspense boundaries in tests and UI components.
 */
export async function delayedValue<T>(value: T, ms: number): Promise<T> {
  await delay(ms)
  return value
}
