"use client"

import { useEffect, type DependencyList } from "react"

type ModifierKey = "ctrl" | "meta" | "shift" | "alt"

const MODIFIER_ALIASES: Record<string, ModifierKey> = {
  control: "ctrl",
  cmd: "meta",
  command: "meta",
  option: "alt",
}

export type HotkeyConfig = {
  combo: string
  handler: (event: KeyboardEvent) => void
  /**
   * Prevent the browser default behaviour when the hotkey fires.
   * Defaults to true for convenience.
   */
  preventDefault?: boolean
  /**
   * Toggle the hotkey without removing it from the configuration array.
   */
  enabled?: boolean
}

type ParsedHotkey = {
  key: string | null
  modifiers: Partial<Record<ModifierKey, boolean>>
}

const cache = new Map<string, ParsedHotkey>()

function parseCombo(combo: string): ParsedHotkey {
  const existing = cache.get(combo)
  if (existing) {
    return existing
  }

  const segments = combo
    .toLowerCase()
    .split("+")
    .map((segment) => segment.trim())
    .filter(Boolean)

  const modifiers: Partial<Record<ModifierKey, boolean>> = {}
  let key: string | null = null

  for (const segment of segments) {
    const mapped = MODIFIER_ALIASES[segment] ?? (segment as ModifierKey)

    if (mapped === "ctrl" || mapped === "meta" || mapped === "shift" || mapped === "alt") {
      modifiers[mapped] = true
      continue
    }

    key = segment
  }

  const parsed: ParsedHotkey = { key, modifiers }
  cache.set(combo, parsed)
  return parsed
}

function matchesHotkey(event: KeyboardEvent, parsed: ParsedHotkey) {
  const targetKey = parsed.key
  const eventKey = event.key.toLowerCase()

  if (targetKey && targetKey !== eventKey) {
    return false
  }

  if ((parsed.modifiers.ctrl ?? false) !== event.ctrlKey) {
    return false
  }

  if ((parsed.modifiers.meta ?? false) !== event.metaKey) {
    return false
  }

  if ((parsed.modifiers.shift ?? false) !== event.shiftKey) {
    return false
  }

  if ((parsed.modifiers.alt ?? false) !== event.altKey) {
    return false
  }

  // Guard against extra modifiers that were not requested.
  if (!parsed.modifiers.ctrl && event.ctrlKey) {
    return false
  }

  if (!parsed.modifiers.meta && event.metaKey) {
    return false
  }

  if (!parsed.modifiers.shift && event.shiftKey) {
    return false
  }

  if (!parsed.modifiers.alt && event.altKey) {
    return false
  }

  return true
}

export function useHotkeys(configs: HotkeyConfig[], deps: DependencyList = []) {
  useEffect(() => {
    const activeConfigs = configs.filter((config) => config.enabled !== false)

    if (activeConfigs.length === 0) {
      return
    }

    function listener(event: KeyboardEvent) {
      for (const config of activeConfigs) {
        const parsed = parseCombo(config.combo)
        if (!matchesHotkey(event, parsed)) {
          continue
        }

        if (config.preventDefault !== false) {
          event.preventDefault()
        }

        config.handler(event)
      }
    }

    window.addEventListener("keydown", listener)
    return () => {
      window.removeEventListener("keydown", listener)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configs, ...deps])
}
