import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, ExternalLink, FileText, Share2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  SHARE_DESTINATION_META,
  type ShareDestination,
  coerceSharePayloadFromParams,
  determineShareDestination,
  normalizeShareDestination,
} from "@/lib/share/intent"

export const metadata: Metadata = {
  title: "Share intent",
  description: "Review shared content and jump into the Roomsily workspace that can take action on it.",
}

interface ShareIntentPageProps {
  searchParams: Record<string, string | string[] | undefined>
}

function extractParam(params: ShareIntentPageProps["searchParams"], key: string) {
  const value = params[key]
  if (Array.isArray(value)) {
    return value.length ? value[0] : undefined
  }
  return value
}

function isPayloadEmpty(payload: { title?: string; text?: string; url?: string; fileNames?: string[] }) {
  return !payload.title && !payload.text && !payload.url && !(payload.fileNames && payload.fileNames.length)
}

export default function ShareIntentPage({ searchParams }: ShareIntentPageProps) {
  const payload = coerceSharePayloadFromParams(searchParams)
  const rawDestination = extractParam(searchParams, "destination")
  const explicitDestination = normalizeShareDestination(rawDestination)
  const resolution = determineShareDestination(payload, explicitDestination ?? rawDestination)
  const activeMeta = SHARE_DESTINATION_META[resolution.destination]

  const declaredReason = extractParam(searchParams, "reason")
  const shareReason = declaredReason || resolution.reason
  const source = extractParam(searchParams, "source")
  const fileNames = payload.fileNames ?? []

  const supportingDestinations = (Object.keys(SHARE_DESTINATION_META) as ShareDestination[])
    .filter((destination) => destination !== resolution.destination)
    .map((destination) => ({ destination, meta: SHARE_DESTINATION_META[destination] }))

  return (
    <div className="container max-w-4xl space-y-10 py-12">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={resolution.explicit ? "default" : "outline"}>
            {resolution.explicit ? "Shortcut selected" : "Smart routing"}
          </Badge>
          {source ? <Badge variant="secondary">Shared via {source}</Badge> : null}
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Shared content ready for {activeMeta.label}</h1>
          <p className="text-base text-muted-foreground sm:text-lg">{shareReason}</p>
        </div>
        <Link href={activeMeta.href} className="inline-flex">
          <Button className="gap-2" size="lg">
            <ExternalLink className="size-4" aria-hidden />
            Continue to {activeMeta.label}
          </Button>
        </Link>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="size-5" aria-hidden />
            Shared details
          </CardTitle>
          <CardDescription>
            Roomsily captured the payload provided by the originating app. Confirm the context before finalising any actions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isPayloadEmpty(payload) ? (
            <p className="text-sm text-muted-foreground">
              No text, links, or files were included in this share. You can still continue to {activeMeta.label} to log a note for your housemates.
            </p>
          ) : (
            <dl className="space-y-4 text-sm">
              {payload.title ? (
                <div>
                  <dt className="font-semibold text-foreground">Title</dt>
                  <dd className="text-muted-foreground">{payload.title}</dd>
                </div>
              ) : null}
              {payload.text ? (
                <div>
                  <dt className="font-semibold text-foreground">Notes</dt>
                  <dd className="whitespace-pre-wrap text-muted-foreground">{payload.text}</dd>
                </div>
              ) : null}
              {payload.url ? (
                <div>
                  <dt className="font-semibold text-foreground">Link</dt>
                  <dd className="break-all text-muted-foreground">{payload.url}</dd>
                </div>
              ) : null}
              {fileNames.length ? (
                <div>
                  <dt className="font-semibold text-foreground">Attachments</dt>
                  <dd className="text-muted-foreground">
                    <ul className="list-inside list-disc space-y-1">
                      {fileNames.map((name) => (
                        <li key={name}>{name}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ) : null}
            </dl>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5" aria-hidden />
            Recommended next steps
          </CardTitle>
          <CardDescription>{activeMeta.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{activeMeta.helper}</p>
          <Separator />
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-sm">Primary destination</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Jump into {activeMeta.label} to continue processing the shared content.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={activeMeta.href} className="inline-flex">
                  <Button variant="outline" size="sm" className="gap-2">
                    <ArrowRight className="size-4" aria-hidden />
                    Open {activeMeta.label}
                  </Button>
                </Link>
              </CardContent>
            </Card>
            {supportingDestinations.slice(0, 3).map(({ destination, meta }) => (
              <Card key={destination} className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-sm">Also consider {meta.label}</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">{meta.helper}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href={meta.href} className="inline-flex">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <ArrowRight className="size-4" aria-hidden />
                      Review {meta.label}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
