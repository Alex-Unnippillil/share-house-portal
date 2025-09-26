export const SERVICE_WORKER_PATH = "/sw.js"

export function isServiceWorkerSupported() {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator
  )
}

export async function registerServiceWorker() {
  if (!isServiceWorkerSupported()) {
    return undefined
  }

  try {
    const registration = await navigator.serviceWorker.register(SERVICE_WORKER_PATH)
    if (typeof registration.update === "function") {
      registration.update().catch(() => {
        // Ignore update errors; they'll retry later
      })
    }
    return registration
  } catch (error) {
    console.error("Failed to register service worker", error)
    return undefined
  }
}
