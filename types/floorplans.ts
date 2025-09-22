export type FloorplanLevelMetadata = {
  zoom: number
  scale: number
  width: number
  height: number
  tilesX: number
  tilesY: number
}

export type FloorplanMetadata = {
  planId: string
  name: string
  source: string
  width: number
  height: number
  tileSize: number
  maxZoom: number
  levels: FloorplanLevelMetadata[]
  checksum: string
  bytes: number
  format: string
  createdAt: string
}

export type FloorplanManifestEntry = FloorplanMetadata & {
  tileBaseUrl: string
  metadataUrl: string
  previewUrl?: string
}
