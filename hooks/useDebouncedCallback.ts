import { useEffect, useMemo, useRef } from "react";

type AnyFn = (...args: any[]) => any;

export interface DebouncedOptions {
  /** Delay in milliseconds before invoking the callback */
  delay?: number;
}

export type DebouncedCallback<T extends AnyFn> = ((
  ...args: Parameters<T>
) => void) & {
  cancel: () => void;
  flush: () => void;
  pending: () => boolean;
};

const MIN_DELAY = 150;
const MAX_DELAY = 250;

export const MIN_DEBOUNCE_DELAY = MIN_DELAY;
export const MAX_DEBOUNCE_DELAY = MAX_DELAY;

const normalizeDelay = (delay: number | undefined) => {
  const resolved = typeof delay === "number" ? delay : 200;
  return Math.min(MAX_DELAY, Math.max(MIN_DELAY, resolved));
};

export function createDebouncedCallback<T extends AnyFn>(
  callback: T,
  options: number | DebouncedOptions = {},
): DebouncedCallback<T> {
  const delay = normalizeDelay(
    typeof options === "number" ? options : options.delay,
  );

  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  const debounced = ((...args: Parameters<T>) => {
    lastArgs = args;
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      const argsToUse = lastArgs;
      lastArgs = null;
      if (argsToUse) {
        callback(...argsToUse);
      }
    }, delay);
  }) as DebouncedCallback<T>;

  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    lastArgs = null;
  };

  debounced.flush = () => {
    if (!timer) return;
    clearTimeout(timer);
    timer = null;
    if (lastArgs) {
      callback(...lastArgs);
      lastArgs = null;
    }
  };

  debounced.pending = () => timer !== null;

  return debounced;
}

export function useDebouncedCallback<T extends AnyFn>(
  callback: T,
  options: number | DebouncedOptions = {},
): DebouncedCallback<T> {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const resolvedDelay = normalizeDelay(
    typeof options === "number" ? options : options.delay,
  );

  const debounced = useMemo(() => {
    return createDebouncedCallback((...args: Parameters<T>) => {
      callbackRef.current(...args);
    }, resolvedDelay);
  }, [resolvedDelay]);

  useEffect(() => {
    return () => {
      debounced.cancel();
    };
  }, [debounced]);

  return debounced;
}
