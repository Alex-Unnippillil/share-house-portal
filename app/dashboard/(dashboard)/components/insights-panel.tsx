"use client"

import { useCallback, useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { track } from "@vercel/analytics/react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

function LoadingState({ label }: { label: string }) {
  return (
    <div
      className="space-y-3 rounded-lg border border-dashed border-border/60 bg-muted/20 p-4"
      role="status"
      aria-live="polite"
    >
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-32 w-full rounded-lg" />
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

const AnalyticsCharts = dynamic(() => import("./analytics-charts"), {
  ssr: false,
  loading: () => <LoadingState label="Preparing analytics…" />,
})

const FeaturePrism = dynamic(() => import("@/components/feature-prism"), {
  ssr: false,
  loading: () => <LoadingState label="Warming up 3D preview…" />,
})

const SECTION_CONFIG = [
  {
    value: "analytics",
    label: "Analytics",
    description: "Key rent, maintenance, and renewal metrics in chart form.",
    loaderLabel: "Preparing analytics…",
    Component: AnalyticsCharts,
  },
  {
    value: "visualization",
    label: "3D Floorplan",
    description: "Interactive holographic preview of the shared household layout.",
    loaderLabel: "Warming up 3D preview…",
    Component: FeaturePrism,
  },
] as const

type SectionKey = (typeof SECTION_CONFIG)[number]["value"]

type Surface = "tabs" | "accordion"

export default function InsightsPanel() {
  const [activeTab, setActiveTab] = useState<SectionKey>("analytics")
  const [openSection, setOpenSection] = useState<SectionKey | null>("analytics")
  const [loadedSections, setLoadedSections] = useState<Record<SectionKey, boolean>>({
    analytics: true,
    visualization: false,
  })

  const markSectionOpened = useCallback(
    (section: SectionKey, surface: Surface, meta?: Record<string, unknown>) => {
      setLoadedSections((previous) =>
        previous[section] ? previous : { ...previous, [section]: true }
      )
      track("progressive_disclosure_surface_opened", {
        section,
        surface,
        ...meta,
      })
    },
    []
  )

  useEffect(() => {
    markSectionOpened("analytics", "tabs", { initial: true })
  }, [markSectionOpened])

  const handleTabChange = useCallback(
    (value: string) => {
      const matching = SECTION_CONFIG.find((item) => item.value === value)
      if (!matching) {
        return
      }

      const section = matching.value
      setActiveTab(section)
      setOpenSection((current) => (current === section ? current : section))
      markSectionOpened(section, "tabs")
    },
    [markSectionOpened]
  )

  const toggleAccordionSection = useCallback(
    (section: SectionKey) => {
      setOpenSection((current) => {
        const next = current === section ? null : section
        if (next) {
          setActiveTab(next)
          markSectionOpened(next, "accordion")
        }
        return next
      })
    },
    [markSectionOpened]
  )

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Progressive insights</CardTitle>
        <CardDescription>
          Analytics charts and 3D previews only mount after a tenant opts to explore them.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="hidden md:block">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
            <TabsList>
              {SECTION_CONFIG.map((section) => (
                <TabsTrigger key={section.value} value={section.value} className="text-sm font-medium">
                  {section.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {SECTION_CONFIG.map((section) => (
              <TabsContent key={section.value} value={section.value} className="space-y-4">
                <p className="text-sm text-muted-foreground">{section.description}</p>
                {loadedSections[section.value] ? (
                  <section.Component />
                ) : (
                  <LoadingState label={section.loaderLabel} />
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>

        <div className="space-y-3 md:hidden" role="list">
          {SECTION_CONFIG.map((section) => {
            const isOpen = openSection === section.value
            return (
              <div
                key={section.value}
                className="rounded-lg border border-border/60 bg-card/80 backdrop-blur"
                role="listitem"
              >
                <button
                  type="button"
                  onClick={() => toggleAccordionSection(section.value)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium"
                  aria-expanded={isOpen}
                >
                  <span>{section.label}</span>
                  <span className="text-xs text-muted-foreground">{isOpen ? "Hide" : "Reveal"}</span>
                </button>
                <div
                  className={cn(
                    "grid overflow-hidden transition-[grid-template-rows] duration-300 ease-in-out",
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  )}
                >
                  <div className="min-h-0 space-y-3 px-4 pb-4 text-sm text-muted-foreground">
                    {isOpen && <p>{section.description}</p>}
                    {isOpen ? (
                      loadedSections[section.value] ? (
                        <section.Component />
                      ) : (
                        <LoadingState label={section.loaderLabel} />
                      )
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
