'use client'

import * as React from 'react'
import { createContext, useContextSelector } from 'use-context-selector'

const LOCAL_STORAGE_KEY = 'sidebar'

type SidebarStore = {
  getSnapshot: () => boolean
  subscribe: (listener: () => void) => () => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
}

const SidebarContext = createContext<SidebarStore | undefined>(undefined)

function readSidebarPreference(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  const storedValue = window.localStorage.getItem(LOCAL_STORAGE_KEY)

  if (!storedValue) {
    return false
  }

  try {
    return JSON.parse(storedValue)
  } catch {
    return false
  }
}

function persistSidebarPreference(isOpen: boolean) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify(isOpen),
    )
  } catch {
    // Ignore write failures (private mode, etc.).
  }
}

function createSidebarStore(initialState: boolean): SidebarStore {
  let state = initialState
  const listeners = new Set<() => void>()

  const setState = (next: boolean) => {
    if (state === next) {
      return
    }

    state = next
    persistSidebarPreference(state)
    listeners.forEach(listener => listener())
  }

  persistSidebarPreference(state)

  return {
    getSnapshot: () => state,
    subscribe: listener => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    setSidebarOpen: setState,
    toggleSidebar: () => setState(!state),
  }
}

function useSidebarSelector<T>(selector: (store: SidebarStore) => T): T {
  return useContextSelector(SidebarContext, store => {
    if (!store) {
      throw new Error('useSidebar must be used within a SidebarProvider')
    }
    return selector(store)
  })
}

export function useSidebar() {
  const store = useSidebarSelector(value => value)
  const isSidebarOpen = React.useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  )

  return React.useMemo(
    () => ({
      isSidebarOpen,
      setSidebarOpen: store.setSidebarOpen,
      toggleSidebar: store.toggleSidebar,
    }),
    [isSidebarOpen, store.setSidebarOpen, store.toggleSidebar],
  )
}

export function useSidebarOpen() {
  const subscribe = useSidebarSelector(store => store.subscribe)
  const getSnapshot = useSidebarSelector(store => store.getSnapshot)

  return React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function useSidebarSetOpen() {
  return useSidebarSelector(store => store.setSidebarOpen)
}

export function useSidebarToggle() {
  return useSidebarSelector(store => store.toggleSidebar)
}

interface SidebarProviderProps {
  children: React.ReactNode
}

export function SidebarProvider({ children }: SidebarProviderProps) {
  const storeRef = React.useRef<SidebarStore>()

  if (!storeRef.current) {
    storeRef.current = createSidebarStore(readSidebarPreference())
  }

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== LOCAL_STORAGE_KEY || event.newValue === null) {
        return
      }

      try {
        const parsed = JSON.parse(event.newValue)
        if (typeof parsed === 'boolean') {
          storeRef.current?.setSidebarOpen(parsed)
        }
      } catch {
        // Ignore invalid payloads.
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  return (
    <SidebarContext.Provider value={storeRef.current}>
      {children}
    </SidebarContext.Provider>
  )
}
