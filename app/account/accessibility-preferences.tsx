"use client"

import { useAccessibility } from "@/components/accessibility/accessibility-provider"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

export function AccessibilityPreferencesPanel() {
  const { dyslexiaFont, readerMode, setPreference } = useAccessibility()

  return (
    <section
      aria-labelledby="accessibility-preferences"
      className="space-y-6 rounded-lg border p-6"
    >
      <div className="space-y-1">
        <h2 id="accessibility-preferences" className="text-lg font-semibold">
          Accessibility preferences
        </h2>
        <p className="text-sm text-muted-foreground">
          Personalize typography for easier reading across the portal.
        </p>
      </div>
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 pr-4">
            <Label htmlFor="dyslexia-font" className="text-base">
              Dyslexia-friendly font
            </Label>
            <p id="dyslexia-font-description" className="text-sm text-muted-foreground">
              Swap the interface font for OpenDyslexic to increase letter distinction.
            </p>
          </div>
          <Switch
            id="dyslexia-font"
            checked={dyslexiaFont}
            onCheckedChange={(checked) => setPreference("dyslexiaFont", checked)}
            aria-describedby="dyslexia-font-description"
          />
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 pr-4">
            <Label htmlFor="reader-mode" className="text-base">
              Reader mode
            </Label>
            <p id="reader-mode-description" className="text-sm text-muted-foreground">
              Reduce line length and increase line spacing for long-form updates and policies.
            </p>
          </div>
          <Switch
            id="reader-mode"
            checked={readerMode}
            onCheckedChange={(checked) => setPreference("readerMode", checked)}
            aria-describedby="reader-mode-description"
          />
        </div>
      </div>
    </section>
  )
}
