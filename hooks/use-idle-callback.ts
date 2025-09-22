"use client"

import { useCallback, useEffect, useRef } from "react"

type IdleTaskCancel = () => void

type IdleRequestScheduler = (
  callback: IdleRequestCallback,
  options?: IdleRequestOptions,
) => number

type IdleCancelScheduler = (id: number) => void

const fallbackRequestIdleCallback: IdleRequestScheduler = (
  callback,
  options,
) => {
  const timeout = typeof options?.timeout === "number" ? options.timeout : 1
  return window.setTimeout(() => {
    const start = Date.now()
    callback({
      didTimeout: true,
      timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
    } as IdleDeadline)
  }, timeout)
}

const fallbackCancelIdleCallback: IdleCancelScheduler = (id) => {
  window.clearTimeout(id)
}

export function useIdleCallback() {
  const idleCallbacksRef = useRef(new Set<number>())

  const schedule = useCallback(
    (callback: IdleRequestCallback, options?: IdleRequestOptions): IdleTaskCancel => {
      if (typeof window === "undefined") {
        callback({
          didTimeout: true,
          timeRemaining: () => 0,
        } as IdleDeadline)
        return () => {}
      }

      const requestIdle = (window.requestIdleCallback || fallbackRequestIdleCallback) as IdleRequestScheduler
      const cancelIdle = (window.cancelIdleCallback || fallbackCancelIdleCallback) as IdleCancelScheduler

      const id = requestIdle((deadline) => {
        idleCallbacksRef.current.delete(id)
        callback(deadline)
      }, options)

      idleCallbacksRef.current.add(id)

      return () => {
        if (idleCallbacksRef.current.has(id)) {
          cancelIdle(id)
          idleCallbacksRef.current.delete(id)
        }
      }
    },
    [],
  )

  useEffect(() => {
    return () => {
      if (typeof window === "undefined") return

      const cancelIdle = (window.cancelIdleCallback || fallbackCancelIdleCallback) as IdleCancelScheduler

      idleCallbacksRef.current.forEach((id) => {
        cancelIdle(id)
      })
      idleCallbacksRef.current.clear()
    }
  }, [])

  return schedule
}
