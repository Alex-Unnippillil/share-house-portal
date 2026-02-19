"use client"

import { cn } from "@/lib/utils"

export type Persona = "roommate" | "property_manager"

type PersonaToggleProps = {
  value: Persona | null
  onChange: (persona: Persona) => void
}

const personaOptions: Array<{ label: string; value: Persona }> = [
  { label: "I'm a roommate", value: "roommate" },
  { label: "I manage properties", value: "property_manager" },
]

export function PersonaToggle({ value, onChange }: PersonaToggleProps) {
  return (
    <div
      className="inline-flex flex-wrap items-center gap-2 rounded-full border border-border/70 bg-background/90 p-1"
      role="group"
      aria-label="Select your perspective"
    >
      {personaOptions.map((option) => {
        const isSelected = option.value === value

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={isSelected}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition",
              isSelected
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
