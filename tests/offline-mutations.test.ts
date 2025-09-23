import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OfflineMutationQueue } from "@/lib/offline/queue";
import { mutateOffline } from "@/lib/offline/mutate-offline";
import { OfflineMutationConflictError } from "@/lib/offline/errors";

describe("offline mutation queue", () => {
  const queue = new OfflineMutationQueue("test-offline-mutations");
  const MAINTENANCE_KEY = "maintenance-request";
  const TODO_CREATE_KEY = "todo:create";
  const TODO_UPDATE_KEY = "todo:update";
  const BOOKING_KEY = "amenity-booking";

  beforeEach(async () => {
    await queue.clear();
  });

  afterEach(async () => {
    await queue.clear();
  });

  it("queues maintenance mutations while offline and syncs them later", async () => {
    const processed: Array<{ request: { title: string } }> = [];

    const result = await mutateOffline(
      {
        key: MAINTENANCE_KEY,
        handler: async (payload: { request: { title: string } }) => {
          processed.push(payload);
        },
        queue,
      },
      { request: { title: "Leaky faucet" } },
      { forceQueue: true }
    );

    expect(result.status).toBe("queued");
    expect(await queue.count(MAINTENANCE_KEY)).toBe(1);

    await queue.processQueue();

    expect(processed).toHaveLength(1);
    expect(processed[0]).toEqual({ request: { title: "Leaky faucet" } });
    expect(await queue.count(MAINTENANCE_KEY)).toBe(0);
  });

  it("persists multiple queued todo mutations and processes each handler", async () => {
    const created: Array<{ todo: { title: string; completed: boolean } }> = [];
    const updated: Array<{ id: string; todo: { title: string; completed: boolean } }> = [];

    queue.registerHandler(TODO_CREATE_KEY, async (payload: { todo: { title: string; completed: boolean } }) => {
      created.push(payload);
    });

    queue.registerHandler(
      TODO_UPDATE_KEY,
      async (payload: { id: string; todo: { title: string; completed: boolean } }) => {
        updated.push(payload);
      }
    );

    await queue.enqueue(TODO_CREATE_KEY, { todo: { title: "Take bins out", completed: false } });
    await queue.enqueue(TODO_UPDATE_KEY, { id: "todo-1", todo: { title: "Take bins out", completed: true } });

    expect(await queue.count()).toBe(2);

    await queue.processQueue();

    expect(created).toHaveLength(1);
    expect(updated).toHaveLength(1);
    expect(created[0].todo.completed).toBe(false);
    expect(updated[0].todo.completed).toBe(true);
    expect(await queue.count()).toBe(0);
  });

  it("notifies conflict events and removes queued booking", async () => {
    const events: string[] = [];
    const unsubscribe = queue.subscribe((event) => {
      if (event.record.type === BOOKING_KEY) {
        events.push(event.type);
      }
    });

    await mutateOffline(
      {
        key: BOOKING_KEY,
        handler: async () => {
          throw new OfflineMutationConflictError("Slot already booked");
        },
        queue,
      },
      { start: "2024-01-01T10:00:00Z" },
      { forceQueue: true }
    );

    await queue.processQueue();
    unsubscribe();

    expect(events).toContain("conflict");
    expect(await queue.count(BOOKING_KEY)).toBe(0);
  });

  it("returns conflict immediately when handler rejects without queuing", async () => {
    const handler = vi.fn(async () => {
      throw new OfflineMutationConflictError("Duplicate submission");
    });

    const result = await mutateOffline(
      {
        key: "maintenance-conflict-test",
        handler,
        queue,
      },
      { request: { title: "Duplicate" } }
    );

    expect(result.status).toBe("conflict");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(await queue.count("maintenance-conflict-test")).toBe(0);
  });
});
