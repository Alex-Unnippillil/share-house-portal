"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@/utils/supabase-browser"

export type SupabaseStatus = "online" | "offline" | "reconnecting"

type MutationTask = {
  key: string
  execute: () => Promise<unknown>
  resolve: (value: unknown) => void
  reject: (error: unknown) => void
  promise: Promise<unknown>
}

type SupabaseConnectivityContextValue = {
  status: SupabaseStatus
  isOffline: boolean
  isReconnecting: boolean
  pendingMutations: number
  enqueueMutation: <T>(key: string, execute: () => Promise<T>) => Promise<T>
}

const SupabaseConnectivityContext = createContext<SupabaseConnectivityContextValue | undefined>(
  undefined
)

export function SupabaseConnectivityProvider({
  children
}: {
  children: React.ReactNode
}) {
  const supabase = useMemo(() => createClient(), [])
  const [connectionState, setConnectionState] = useState(() =>
    supabase.realtime.connectionState()
  )
  const [networkOnline, setNetworkOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  )
  const [pendingMutations, setPendingMutations] = useState(0)
  const queueRef = useRef<MutationTask[]>([])
  const taskMapRef = useRef<Map<string, MutationTask>>(new Map())
  const processingRef = useRef(false)
  const statusRef = useRef<SupabaseStatus>("online")

  useEffect(() => {
    supabase.realtime.connect()

    const updateConnectionState = () => {
      setConnectionState(supabase.realtime.connectionState())
    }

    updateConnectionState()
    const interval = setInterval(updateConnectionState, 1000)

    return () => {
      clearInterval(interval)
      supabase.realtime.disconnect()
    }
  }, [supabase])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const handleOnline = () => setNetworkOnline(true)
    const handleOffline = () => setNetworkOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const status: SupabaseStatus = useMemo(() => {
    if (!networkOnline) {
      return "offline"
    }

    if (connectionState === "open") {
      return "online"
    }

    if (connectionState === "connecting" || connectionState === "closing") {
      return "reconnecting"
    }

    return "offline"
  }, [connectionState, networkOnline])

  statusRef.current = status

  const runTask = useCallback(async (task: MutationTask) => {
    try {
      const result = await task.execute()
      task.resolve(result)

      taskMapRef.current.delete(task.key)
    } catch (error) {
      if (statusRef.current !== "online") {
        queueRef.current.unshift(task)
        setPendingMutations(queueRef.current.length)
        return
      }

      task.reject(error)
      taskMapRef.current.delete(task.key)
    } finally {
      setPendingMutations(queueRef.current.length)
    }
  }, [])

  const isReady = status === "online"

  const processQueue = useCallback(async () => {
    if (!isReady || processingRef.current) {
      return
    }

    processingRef.current = true

    try {
      while (queueRef.current.length > 0 && statusRef.current === "online") {
        const task = queueRef.current.shift()

        if (!task) {
          continue
        }

        setPendingMutations(queueRef.current.length)
        await runTask(task)
      }
    } finally {
      processingRef.current = false
    }
  }, [isReady, runTask])

  useEffect(() => {
    if (status === "online") {
      void processQueue()
    }
  }, [status, processQueue])

  const enqueueMutation = useCallback(
    <T,>(key: string, execute: () => Promise<T>) => {
      const existingTask = taskMapRef.current.get(key)

      if (existingTask) {
        return existingTask.promise as Promise<T>
      }

      let resolve!: (value: T) => void
      let reject!: (error: unknown) => void

      const promise = new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
      })

      const task: MutationTask = {
        key,
        execute,
        resolve,
        reject,
        promise
      }

      taskMapRef.current.set(key, task)

      if (isReady) {
        void runTask(task)
      } else {
        queueRef.current.push(task)
        setPendingMutations(queueRef.current.length)
      }

      void processQueue()

      return promise
    },
    [isReady, processQueue, runTask]
  )

  const value = useMemo(
    () => ({
      status,
      isOffline: status === "offline",
      isReconnecting: status === "reconnecting",
      pendingMutations,
      enqueueMutation
    }),
    [enqueueMutation, pendingMutations, status]
  )

  return (
    <SupabaseConnectivityContext.Provider value={value}>
      {children}
    </SupabaseConnectivityContext.Provider>
  )
}

export function useSupabaseConnectivity() {
  const context = useContext(SupabaseConnectivityContext)

  if (!context) {
    throw new Error(
      "useSupabaseConnectivity must be used within a SupabaseConnectivityProvider"
    )
  }

  return context
}
