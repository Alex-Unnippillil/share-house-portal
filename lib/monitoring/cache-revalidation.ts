export type CacheRevalidationEventStatus = "success" | "failure" | "skipped"

export interface CacheRevalidationEvent {
  target: string
  status: CacheRevalidationEventStatus
  eventType?: string
  table?: string
  reason?: string
  error?: string
  timestamp: number
}

class CacheRevalidationMonitor {
  #events: CacheRevalidationEvent[] = []

  record(event: Omit<CacheRevalidationEvent, "timestamp">) {
    this.#events.push({ ...event, timestamp: Date.now() })
  }

  getEvents() {
    return [...this.#events]
  }

  getEventsForTarget(target: string) {
    return this.#events.filter((event) => event.target === target)
  }

  clear() {
    this.#events = []
  }
}

export const cacheRevalidationMonitor = new CacheRevalidationMonitor()
