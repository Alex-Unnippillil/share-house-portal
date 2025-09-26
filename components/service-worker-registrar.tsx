"use client"

import { useEffect } from "react"

import { registerServiceWorker } from "@/lib/service-worker"

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return
    }

    const register = () => {
      void registerServiceWorker()
    }

    if (document.readyState === "complete") {
      register()
      return
    }

    window.addEventListener("load", register, { once: true })
    return () => {
      window.removeEventListener("load", register)
    }
  }, [])

  return null
}
