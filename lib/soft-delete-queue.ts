export class SoftDeleteQueue<T> {
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly items = new Map<string, T>();
  private readonly onExpire: (id: string, item: T) => void | Promise<void>;

  constructor(
    private readonly windowMs: number,
    onExpire: (id: string, item: T) => void | Promise<void>
  ) {
    this.onExpire = onExpire;
  }

  schedule(id: string, item: T) {
    this.clear(id);
    this.items.set(id, item);

    const timer = setTimeout(() => {
      this.timers.delete(id);
      const stored = this.items.get(id);
      if (!stored) {
        return;
      }
      this.items.delete(id);
      Promise.resolve(this.onExpire(id, stored)).catch((error) => {
        console.error("SoftDeleteQueue expire handler failed", error);
      });
    }, this.windowMs);

    this.timers.set(id, timer);
  }

  undo(id: string) {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    const item = this.items.get(id);
    if (item !== undefined) {
      this.items.delete(id);
      return item;
    }

    return undefined;
  }

  has(id: string) {
    return this.timers.has(id);
  }

  clear(id: string) {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.items.delete(id);
  }

  flush() {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.items.clear();
  }
}
