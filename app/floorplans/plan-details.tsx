import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { FloorplanMetadata } from "@/types/floorplans"

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes)) {
    return "0 B"
  }

  const units = ["B", "KB", "MB", "GB"]
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  return `${size.toFixed(size < 10 && unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`
}

type PlanDetailsProps = {
  metadata: FloorplanMetadata
  metadataUrl: string
}

export function PlanDetails({ metadata, metadataUrl }: PlanDetailsProps) {
  return (
    <Card className="h-full">
      <CardHeader className="space-y-2">
        <CardTitle className="text-xl font-semibold">Plan metadata</CardTitle>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{metadata.width} × {metadata.height}px</span>
          <Badge variant="secondary">{metadata.format.toUpperCase()}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 text-sm">
        <dl className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <dt className="text-muted-foreground">Tile size</dt>
            <dd className="font-medium">{metadata.tileSize}px</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-muted-foreground">Max zoom</dt>
            <dd className="font-medium">{metadata.maxZoom}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-muted-foreground">Source file</dt>
            <dd className="break-all font-medium">{metadata.source}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-muted-foreground">Source size</dt>
            <dd className="font-medium">{formatBytes(metadata.bytes)}</dd>
          </div>
        </dl>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Zoom levels
          </h3>
          <ul className="space-y-2 rounded-lg border bg-muted/30 p-3">
            {metadata.levels.map((level) => (
              <li
                key={level.zoom}
                className="flex items-center justify-between gap-2 rounded-md bg-background/70 px-3 py-2 shadow-sm"
              >
                <div className="flex flex-col">
                  <span className="font-medium">Zoom {level.zoom}</span>
                  <span className="text-xs text-muted-foreground">
                    {level.width} × {level.height}px · {level.tilesX} × {level.tilesY} tiles
                  </span>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  ×{level.scale.toFixed(3)}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Integrity
          </h3>
          <p className="break-all font-mono text-xs text-muted-foreground">
            {metadata.checksum}
          </p>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Generated {new Date(metadata.createdAt).toLocaleString()}</span>
          <Link
            href={metadataUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Download metadata
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

export default PlanDetails
