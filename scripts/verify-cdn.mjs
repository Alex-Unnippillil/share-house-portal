import { spawn } from 'node:child_process'
import { access, readdir } from 'node:fs/promises'
import path from 'node:path'

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

async function ensurePrecompressedAssets(chunkDir, file) {
  const brotliPath = path.join(chunkDir, `${file}.br`)
  const gzipPath = path.join(chunkDir, `${file}.gz`)

  try {
    await access(brotliPath)
  } catch {
    throw new Error(`Missing brotli-compressed asset for ${file}`)
  }

  try {
    await access(gzipPath)
  } catch {
    throw new Error(`Missing gzip-compressed asset for ${file}`)
  }

  return { brotliPath, gzipPath }
}

async function findHashedChunk(chunkDir) {
  let entries

  try {
    entries = await readdir(chunkDir)
  } catch (error) {
    throw new Error(`Unable to read Next.js chunk output at ${chunkDir}: ${error.message}`)
  }

  const hashedChunk = entries.find(file => /[.-][0-9a-f]{6,}\.js$/i.test(file))

  if (!hashedChunk) {
    throw new Error(`No hashed chunk assets found in ${chunkDir}`)
  }

  return hashedChunk
}

async function main() {
  const chunkDir = path.join(process.cwd(), '.next', 'static', 'chunks')
  const hashedChunk = await findHashedChunk(chunkDir)
  const { brotliPath, gzipPath } = await ensurePrecompressedAssets(chunkDir, hashedChunk)

  const port = process.env.CDN_CHECK_PORT ?? '4010'
  const nextBin = path.join(process.cwd(), 'node_modules', '.bin', 'next')
  const server = spawn(nextBin, ['start', '-p', port], {
    env: { ...process.env, NODE_ENV: 'production' },
    stdio: 'pipe',
  })

  let serverLogs = ''
  server.stderr.on('data', data => {
    serverLogs += data.toString()
  })
  server.stdout.on('data', data => {
    serverLogs += data.toString()
  })

  const assetUrl = `http://127.0.0.1:${port}/_next/static/chunks/${hashedChunk}`
  let response

  try {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      if (server.exitCode !== null) {
        throw new Error(`next start exited early with code ${server.exitCode}\n${serverLogs}`)
      }

      try {
        const res = await fetch(assetUrl, {
          headers: {
            'accept-encoding': 'br, gzip',
          },
        })

        if (res.ok) {
          response = res
          break
        }
      } catch (error) {
        const connectionRefused =
          error instanceof Error &&
          error.cause &&
          typeof error.cause === 'object' &&
          'code' in error.cause &&
          error.cause.code === 'ECONNREFUSED'

        if (!connectionRefused) {
          throw error
        }
      }

      await wait(500)
    }

    if (!response || !response.ok) {
      throw new Error(`Unable to retrieve ${assetUrl} after waiting for server readiness`)
    }

    await response.arrayBuffer()

    const cacheControl = response.headers.get('cache-control') ?? ''
    if (cacheControl.trim() !== 'public, max-age=31536000, immutable') {
      throw new Error(`Unexpected Cache-Control header for ${assetUrl}: "${cacheControl}"`)
    }

    const vary = response.headers.get('vary') ?? ''
    if (!vary.toLowerCase().includes('accept-encoding')) {
      throw new Error(`Vary header for ${assetUrl} does not advertise Accept-Encoding`)
    }

    console.log(`✅ ${assetUrl} served with immutable caching and Accept-Encoding negotiation.`)
    console.log(`   Precompressed artifacts: \n   • ${brotliPath}\n   • ${gzipPath}`)
  } finally {
    if (server.exitCode === null) {
      server.kill('SIGTERM')
      await new Promise(resolve => {
        server.once('close', resolve)
      })
    }
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
