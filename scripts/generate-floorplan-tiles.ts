#!/usr/bin/env tsx

import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import sharp from 'sharp'

import type { Database } from '@/lib/supabase'
import type { FloorplanLevelMetadata, FloorplanMetadata } from '@/types/floorplans'

const TILE_SIZE = 256

const HELP_MESSAGE = `Generate floorplan tiles and upload them to Supabase storage.

Usage:
  pnpm tsx scripts/generate-floorplan-tiles.ts --source ./floorplans/lobby.png --plan-id lobby --bucket floorplans \
    [--name "Lobby"] [--output ./tmp/tiles] [--max-zoom 5] [--dry-run]
`

type CliOptions = {
  source: string
  planId: string
  name?: string
  bucket?: string
  outputDir?: string
  maxZoom?: number
  dryRun: boolean
}

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = { dryRun: false }

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (!token.startsWith('--')) {
      continue
    }

    const key = token.slice(2)
    if (key === 'dry-run') {
      options.dryRun = true
      continue
    }

    const value = argv[index + 1]
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`)
    }

    index += 1

    switch (key) {
      case 'source': {
        options.source = value
        break
      }
      case 'plan-id': {
        options.planId = value
        break
      }
      case 'bucket': {
        options.bucket = value
        break
      }
      case 'name': {
        options.name = value
        break
      }
      case 'output':
      case 'output-dir': {
        options.outputDir = value
        break
      }
      case 'max-zoom': {
        options.maxZoom = Number.parseInt(value, 10)
        if (Number.isNaN(options.maxZoom)) {
          throw new Error('max-zoom must be a number')
        }
        break
      }
      default: {
        throw new Error(`Unknown argument --${key}`)
      }
    }
  }

  if (!options.source || !options.planId) {
    throw new Error(`Missing required arguments.\n${HELP_MESSAGE}`)
  }

  return {
    source: options.source,
    planId: options.planId,
    bucket: options.bucket,
    outputDir: options.outputDir,
    maxZoom: options.maxZoom,
    dryRun: options.dryRun ?? false,
    name: options.name,
  }
}

function resolveBucket(options: CliOptions): string {
  return (
    options.bucket ||
    process.env.SUPABASE_FLOORPLAN_BUCKET ||
    process.env.NEXT_PUBLIC_SUPABASE_FLOORPLAN_BUCKET ||
    'floorplans'
  )
}

function computeDefaultMaxZoom(width: number, height: number): number {
  const maxDimension = Math.max(width, height)
  return Math.max(0, Math.ceil(Math.log2(maxDimension / TILE_SIZE)))
}

async function uploadObject(
  supabase: SupabaseClient<Database>,
  bucket: string,
  pathOnBucket: string,
  body: Buffer | string,
  contentType: string
) {
  const { error } = await supabase.storage.from(bucket).upload(pathOnBucket, body, {
    cacheControl: '31536000',
    upsert: true,
    contentType,
  })

  if (error) {
    throw new Error(`Failed to upload ${pathOnBucket}: ${error.message}`)
  }
}

async function generateTiles(
  sourcePath: string,
  planId: string,
  baseWidth: number,
  baseHeight: number,
  maxZoom: number,
  outputDir: string | undefined,
  dryRun: boolean,
  supabase: SupabaseClient<Database> | null,
  bucket: string
): Promise<FloorplanLevelMetadata[]> {
  const levels: FloorplanLevelMetadata[] = []

  for (let zoom = 0; zoom <= maxZoom; zoom += 1) {
    const scale = Math.pow(2, zoom - maxZoom)
    const levelWidth = Math.max(1, Math.round(baseWidth * scale))
    const levelHeight = Math.max(1, Math.round(baseHeight * scale))

    const tilesX = Math.ceil(levelWidth / TILE_SIZE)
    const tilesY = Math.ceil(levelHeight / TILE_SIZE)

    levels.push({
      zoom,
      scale,
      width: levelWidth,
      height: levelHeight,
      tilesX,
      tilesY,
    })

    const resized = await sharp(sourcePath)
      .resize({
        width: levelWidth,
        height: levelHeight,
        fit: 'fill',
        fastShrinkOnLoad: false,
      })
      .toBuffer()

    for (let tileY = 0; tileY < tilesY; tileY += 1) {
      for (let tileX = 0; tileX < tilesX; tileX += 1) {
        const left = tileX * TILE_SIZE
        const top = tileY * TILE_SIZE
        const tileWidth = Math.min(TILE_SIZE, levelWidth - left)
        const tileHeight = Math.min(TILE_SIZE, levelHeight - top)

        if (tileWidth <= 0 || tileHeight <= 0) {
          continue
        }

        let tile = sharp(resized).extract({
          left,
          top,
          width: tileWidth,
          height: tileHeight,
        })

        const extendRight = TILE_SIZE - tileWidth
        const extendBottom = TILE_SIZE - tileHeight

        if (extendRight > 0 || extendBottom > 0) {
          tile = tile.extend({
            top: 0,
            left: 0,
            right: Math.max(0, extendRight),
            bottom: Math.max(0, extendBottom),
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
        }

        const tileBuffer = await tile.png({ compressionLevel: 9 }).toBuffer()

        if (outputDir) {
          const diskPath = path.join(outputDir, 'tiles', planId, `${zoom}`, `${tileX}`)
          await fs.mkdir(diskPath, { recursive: true })
          await fs.writeFile(path.join(diskPath, `${tileY}.png`), tileBuffer)
        }

        if (!dryRun && supabase) {
          const uploadPath = path.posix.join('tiles', planId, `${zoom}`, `${tileX}`, `${tileY}.png`)
          await uploadObject(supabase, bucket, uploadPath, tileBuffer, 'image/png')
        }
      }
    }
  }

  return levels
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const bucket = resolveBucket(options)
  const planId = options.planId
  const name = options.name ?? planId
  const sourcePath = path.resolve(process.cwd(), options.source)
  const outputDir = options.outputDir
    ? path.resolve(process.cwd(), options.outputDir)
    : undefined

  const stats = await fs.stat(sourcePath)
  if (!stats.isFile()) {
    throw new Error(`Source path does not reference a file: ${sourcePath}`)
  }

  const baseImage = sharp(sourcePath)
  const baseMetadata = await baseImage.metadata()

  if (!baseMetadata.width || !baseMetadata.height) {
    throw new Error('Unable to determine image dimensions')
  }

  const maxZoom = options.maxZoom ?? computeDefaultMaxZoom(baseMetadata.width, baseMetadata.height)

  const checksum = createHash('sha256')
    .update(await fs.readFile(sourcePath))
    .digest('hex')

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  let supabase: SupabaseClient<Database> | null = null
  if (!options.dryRun) {
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to upload tiles')
    }

    supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
      },
    })
  }

  if (outputDir) {
    await fs.mkdir(path.join(outputDir, 'tiles', planId), { recursive: true })
    await fs.mkdir(path.join(outputDir, 'metadata'), { recursive: true })
  }

  console.log(`Generating tiles for ${planId} at up to zoom level ${maxZoom}`)

  const levels = await generateTiles(
    sourcePath,
    planId,
    baseMetadata.width,
    baseMetadata.height,
    maxZoom,
    outputDir,
    options.dryRun,
    supabase,
    bucket
  )

  const metadata: FloorplanMetadata = {
    planId,
    name,
    source: path.basename(sourcePath),
    width: baseMetadata.width,
    height: baseMetadata.height,
    tileSize: TILE_SIZE,
    maxZoom,
    levels,
    checksum,
    bytes: stats.size,
    format: baseMetadata.format ?? path.extname(sourcePath).replace('.', ''),
    createdAt: new Date().toISOString(),
  }

  const metadataJson = JSON.stringify(metadata, null, 2)

  if (outputDir) {
    await fs.writeFile(
      path.join(outputDir, 'metadata', `${planId}.json`),
      metadataJson,
      'utf8'
    )
  }

  if (!options.dryRun && supabase) {
    await uploadObject(
      supabase,
      bucket,
      path.posix.join('metadata', `${planId}.json`),
      Buffer.from(metadataJson),
      'application/json'
    )
  }

  console.log(`Finished processing floorplan ${planId}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
