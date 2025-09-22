import { useEffect, useMemo, useRef } from "react";

type AnyFn = (...args: any[]) => any;

export interface ThrottleOptions {
  /** Minimum time between invocations in milliseconds */
  wait?: number;
}

export type ThrottledCallback<T extends AnyFn> = ((
  ...args: Parameters<T>
) => void) & {
  cancel: () => void;
  flush: () => void;
  pending: () => boolean;
};

const MIN_WAIT = 16;

const normalizeWait = (wait?: number) => {
  const resolved = typeof wait === "number" ? wait : 100;
  return Math.max(MIN_WAIT, resolved);
};

export function createThrottledCallback<T extends AnyFn>(
  callback: T,
  options: number | ThrottleOptions = {},
): ThrottledCallback<T> {
  const wait = normalizeWait(
    typeof options === "number" ? options : options.wait,
  );

  let lastExecution = 0;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: Parameters<T> | null = null;

  const invoke = (args: Parameters<T>) => {
    lastExecution = Date.now();
    callback(...args);
  };

  const throttled = ((...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = wait - (now - lastExecution);
    pendingArgs = args;

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      invoke(args);
      pendingArgs = null;
      return;
    }

    if (!timeout) {
      timeout = setTimeout(() => {
        timeout = null;
        if (pendingArgs) {
          invoke(pendingArgs);
          pendingArgs = null;
        }
      }, remaining);
    }
  }) as ThrottledCallback<T>;

  throttled.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    pendingArgs = null;
  };

  throttled.flush = () => {
    if (!timeout || !pendingArgs) return;
    clearTimeout(timeout);
    timeout = null;
    invoke(pendingArgs);
    pendingArgs = null;
  };

  throttled.pending = () => timeout !== null;

  return throttled;
}

export function useThrottledCallback<T extends AnyFn>(
  callback: T,
  options: number | ThrottleOptions = {},
): ThrottledCallback<T> {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const wait = normalizeWait(
    typeof options === "number" ? options : options.wait,
  );

  const throttled = useMemo(() => {
    return createThrottledCallback((...args: Parameters<T>) => {
      callbackRef.current(...args);
    }, wait);
  }, [wait]);

  useEffect(() => {
    return () => {
      throttled.cancel();
    };
  }, [throttled]);

  return throttled;
}
