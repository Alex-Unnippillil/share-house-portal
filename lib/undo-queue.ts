export type UndoRecord<T extends { id: string }> = {
  record: T
  timeout: ReturnType<typeof setTimeout>
}

export class UndoQueue<T extends { id: string }> {
  private pending = new Map<string, UndoRecord<T>>()

  constructor(private readonly delayMs: number) {}

  enqueue(record: T) {
    this.cancel(record.id)
    const timeout = setTimeout(() => {
      this.pending.delete(record.id)
    }, this.delayMs)

    this.pending.set(record.id, { record, timeout })
  }

  undo(id: string) {
    const entry = this.pending.get(id)
    if (!entry) {
      return null
    }

    clearTimeout(entry.timeout)
    this.pending.delete(id)
    return entry.record
  }

  cancel(id: string) {
    const entry = this.pending.get(id)
    if (!entry) {
      return
    }

    clearTimeout(entry.timeout)
    this.pending.delete(id)
  }

  dispose() {
    for (const entry of this.pending.values()) {
      clearTimeout(entry.timeout)
    }
    this.pending.clear()
  }
}
