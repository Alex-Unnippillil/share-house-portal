import { describe, expect, it, vi, afterEach } from "vitest";

import { SoftDeleteQueue } from "@/lib/soft-delete-queue";

interface TestNotification {
  id: string;
  title: string;
}

const WINDOW_MS = 30_000;

afterEach(() => {
  vi.useRealTimers();
});

describe("SoftDeleteQueue", () => {
  it("restores the item when the undo action is triggered before expiration", () => {
    vi.useFakeTimers();
    const expirationSpy = vi.fn();
    const queue = new SoftDeleteQueue<TestNotification>(WINDOW_MS, expirationSpy);
    const notification: TestNotification = { id: "notif-1", title: "Lease updated" };

    queue.schedule(notification.id, notification);
    const restored = queue.undo(notification.id);

    expect(restored).toEqual(notification);
    expect(queue.has(notification.id)).toBe(false);

    vi.advanceTimersByTime(WINDOW_MS);

    expect(expirationSpy).not.toHaveBeenCalled();
  });

  it("runs the cleanup callback only after the deletion window expires", () => {
    vi.useFakeTimers();
    const expirationSpy = vi.fn();
    const queue = new SoftDeleteQueue<TestNotification>(WINDOW_MS, expirationSpy);

    const notification: TestNotification = { id: "notif-2", title: "Payment received" };
    queue.schedule(notification.id, notification);

    vi.advanceTimersByTime(WINDOW_MS - 1);
    expect(expirationSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(expirationSpy).toHaveBeenCalledTimes(1);
    expect(expirationSpy).toHaveBeenCalledWith(notification.id, notification);
  });

  it("allows multiple pending deletions to be undone independently", () => {
    vi.useFakeTimers();
    const expirationSpy = vi.fn();
    const queue = new SoftDeleteQueue<TestNotification>(WINDOW_MS, expirationSpy);

    const firstNotification: TestNotification = {
      id: "notif-3",
      title: "Inspection scheduled",
    };
    const secondNotification: TestNotification = {
      id: "notif-4",
      title: "Roommate joined",
    };

    queue.schedule(firstNotification.id, firstNotification);
    queue.schedule(secondNotification.id, secondNotification);

    const restored = queue.undo(firstNotification.id);
    expect(restored).toEqual(firstNotification);

    vi.advanceTimersByTime(WINDOW_MS);

    expect(expirationSpy).toHaveBeenCalledTimes(1);
    expect(expirationSpy).toHaveBeenCalledWith(
      secondNotification.id,
      secondNotification
    );
    expect(queue.has(secondNotification.id)).toBe(false);
  });
});
