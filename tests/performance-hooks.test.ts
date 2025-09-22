import { afterEach, describe, expect, it, vi } from "vitest";

import {
  MAX_DEBOUNCE_DELAY,
  MIN_DEBOUNCE_DELAY,
  createDebouncedCallback,
} from "@/hooks/useDebouncedCallback";
import { createThrottledCallback } from "@/hooks/useThrottledCallback";

afterEach(() => {
  vi.useRealTimers();
});

describe("interaction latency controls", () => {
  it("debounces search interactions while staying within the 200ms INP budget", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));

    const invocationTimes: number[] = [];
    const debounced = createDebouncedCallback(() => {
      invocationTimes.push(Date.now());
    });

    const start = Date.now();
    debounced();

    vi.advanceTimersByTime(199);
    expect(invocationTimes).toHaveLength(0);

    vi.advanceTimersByTime(1);
    expect(invocationTimes).toHaveLength(1);
    expect(invocationTimes[0] - start).toBeLessThanOrEqual(200);
  });

  it("clamps debounce delays between 150ms and 250ms", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-02T00:00:00Z"));

    let minCallTime = 0;
    const shortDebounced = createDebouncedCallback(() => {
      minCallTime = Date.now();
    }, 25);

    const minStart = Date.now();
    shortDebounced();
    vi.advanceTimersByTime(MIN_DEBOUNCE_DELAY - 20);
    expect(minCallTime).toBe(0);
    vi.advanceTimersByTime(20);
    expect(minCallTime - minStart).toBeGreaterThanOrEqual(MIN_DEBOUNCE_DELAY);

    let maxCallTime = 0;
    const longDebounced = createDebouncedCallback(() => {
      maxCallTime = Date.now();
    }, 400);

    const maxStart = Date.now();
    longDebounced();
    vi.advanceTimersByTime(MAX_DEBOUNCE_DELAY - 10);
    expect(maxCallTime).toBe(0);
    vi.advanceTimersByTime(10);
    expect(maxCallTime - maxStart).toBeLessThanOrEqual(MAX_DEBOUNCE_DELAY);
  });

  it("throttles drag interactions without exceeding a 200ms INP", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-03T00:00:00Z"));

    const times: number[] = [];
    const throttled = createThrottledCallback(() => {
      times.push(Date.now());
    }, 120);

    const start = Date.now();
    throttled();
    throttled();
    throttled();

    expect(times).toHaveLength(1);
    expect(times[0] - start).toBeLessThanOrEqual(1);

    vi.advanceTimersByTime(110);
    expect(times).toHaveLength(1);

    vi.advanceTimersByTime(20);
    expect(times).toHaveLength(2);
    expect(times[1] - start).toBeLessThanOrEqual(200);

    expect(throttled.pending()).toBe(false);
  });

  it("cancels pending debounced work to avoid unexpected INP spikes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-04T00:00:00Z"));

    const spy = vi.fn();
    const debounced = createDebouncedCallback(spy, 180);

    debounced();
    expect(debounced.pending()).toBe(true);
    debounced.cancel();
    expect(debounced.pending()).toBe(false);

    vi.advanceTimersByTime(500);
    expect(spy).not.toHaveBeenCalled();
  });
});
