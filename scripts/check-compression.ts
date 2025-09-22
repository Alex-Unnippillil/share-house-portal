import { spawn } from 'node:child_process'
import { readFile, stat } from 'node:fs/promises'
import http from 'node:http'
import https from 'node:https'
import path from 'node:path'
import process from 'node:process'
import { setTimeout as sleep } from 'node:timers/promises'
import { once } from 'node:events'

const projectRoot = path.resolve(__dirname, '..')
const host = process.env.COMPRESSION_HOST ?? '127.0.0.1'
const port = Number.parseInt(process.env.COMPRESSION_PORT ?? '4310', 10)
const baseUrl = `http://${host}:${port}`
const apiCompressionMessage =
  'Shared housing updates compress well when repeated; this sentence validates gzip fallback.'

async function runCommand(
  command: string,
  args: string[],
  options?: { env?: NodeJS.ProcessEnv }
) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: 'inherit',
      env: options?.env ?? process.env,
    })

    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`))
      }
    })
  })
}

async function ensureBuild() {
  if (process.env.SKIP_COMPRESSION_BUILD === '1') {
    return
  }

  const buildEnv: NodeJS.ProcessEnv = {
    ...process.env,
    NEXT_DISABLE_ESLINT: process.env.NEXT_DISABLE_ESLINT ?? '1',
    NEXT_DISABLE_TYPECHECK: process.env.NEXT_DISABLE_TYPECHECK ?? '1',
    NEXT_TELEMETRY_DISABLED: process.env.NEXT_TELEMETRY_DISABLED ?? '1',
    TSC_COMPILE_ON_ERROR: process.env.TSC_COMPILE_ON_ERROR ?? '1',
  }

  await runCommand('pnpm', ['build'], { env: buildEnv })
}

function startServer() {
  const server = spawn(
    'pnpm',
    ['exec', 'next', 'start', '-p', String(port), '-H', host],
    {
      cwd: projectRoot,
      stdio: 'pipe',
      env: {
        ...process.env,
        PORT: String(port),
      },
    }
  )

  server.stdout?.on('data', (chunk) => {
    process.stdout.write(chunk)
  })

  server.stderr?.on('data', (chunk) => {
    process.stderr.write(chunk)
  })

  return server
}

async function waitForServer(server: ReturnType<typeof startServer>) {
  const serverExit = once(server, 'exit').then(([code]) => {
    throw new Error(`Next.js server exited early with code ${code}`)
  })

  const deadline = Date.now() + 60_000
  const readyUrl = `${baseUrl}/api/system/compression`

  while (Date.now() < deadline) {
    try {
      const response = await fetch(readyUrl, {
        headers: { 'accept-encoding': 'gzip' },
      })

      if (response.ok) {
        return
      }
    } catch (error) {
      // swallow until timeout
    }

    await Promise.race([sleep(1_000), serverExit])
  }

  throw new Error('Timed out waiting for Next.js server to be ready')
}

async function fetchRaw(
  input: string,
  init?: {
    method?: 'GET' | 'POST'
    headers?: Record<string, string>
    body?: string | Buffer
  }
) {
  const url = new URL(input)
  const isHttps = url.protocol === 'https:'
  const transport = isHttps ? https : http

  return new Promise<{
    status: number
    headers: Headers
    body: Buffer
  }>((resolve, reject) => {
    const request = transport.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: `${url.pathname}${url.search}`,
        method: init?.method ?? 'GET',
        headers: init?.headers,
      },
      (response) => {
        const chunks: Buffer[] = []

        response.on('data', (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        })

        response.on('end', () => {
          const headers = new Headers()
          for (const [key, value] of Object.entries(response.headers)) {
            if (value === undefined) {
              continue
            }

            if (Array.isArray(value)) {
              headers.set(key, value.join(', '))
            } else {
              headers.set(key, value)
            }
          }

          resolve({
            status: response.statusCode ?? 0,
            headers,
            body: Buffer.concat(chunks),
          })
        })
      }
    )

    request.on('error', reject)

    if (init?.body) {
      request.write(init.body)
    }

    request.end()
  })
}

async function resolveStaticAssetPath() {
  const manifestPath = path.join(projectRoot, '.next', 'build-manifest.json')
  const raw = await readFile(manifestPath, 'utf-8')
  const manifest = JSON.parse(raw) as {
    rootMainFiles?: string[]
    pages?: Record<string, string[]>
  }

  const candidate = manifest.rootMainFiles?.find((file) => file.endsWith('.js'))

  if (candidate) {
    return candidate
  }

  const pageAssets = Object.values(manifest.pages ?? {})
  for (const assets of pageAssets) {
    const match = assets.find((file) => file.endsWith('.js'))
    if (match) {
      return match
    }
  }

  throw new Error('Unable to locate a static chunk in build-manifest.json')
}

async function verifyStaticCompression() {
  const assetRelativePath = await resolveStaticAssetPath()
  const staticUrl = `${baseUrl}/_next/${assetRelativePath}`
  const assetDiskPath = path.join(projectRoot, '.next', assetRelativePath)
  const fileStat = await stat(assetDiskPath)
  const originalSize = fileStat.size

  const response = await fetchRaw(staticUrl, {
    headers: {
      'accept-encoding': 'br, gzip;q=0.8',
    },
  })

  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `Static asset request failed with status ${response.status}`
    )
  }

  const encoding = response.headers.get('content-encoding')
  if (encoding !== 'br' && encoding !== 'gzip') {
    throw new Error(
      `Unexpected encoding for static asset. Received ${encoding ?? 'none'}`
    )
  }

  if (encoding !== 'br') {
    console.warn(
      'Static asset responded with gzip encoding. Brotli is typically negotiated by the CDN in production.'
    )
  }

  const compressedSize = response.body.length

  const reduction = 1 - compressedSize / originalSize
  if (reduction < 0.2) {
    throw new Error(
      `Static asset compression ineffective. Reduction ${(reduction * 100).toFixed(2)}%`
    )
  }

  console.log(
    `Static asset /_next/${assetRelativePath} compression reduced size by ${(reduction * 100).toFixed(2)}% (original ${originalSize} bytes, compressed ${compressedSize} bytes).`
  )
}

async function verifyApiCompression() {
  const apiUrl = `${baseUrl}/api/system/compression`
  const payload = {
    intent: 'compression-check',
    timestamp: Date.now(),
    notes: Array.from({ length: 30 }, () => apiCompressionMessage).join(' '),
  }
  const rawBody = JSON.stringify(payload)

  const response = await fetchRaw(apiUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'accept-encoding': 'gzip',
    },
    body: rawBody,
  })

  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `API compression check failed with status ${response.status}`
    )
  }

  const encoding = response.headers.get('content-encoding')
  if (encoding !== 'gzip') {
    throw new Error(`Expected gzip encoding for API response, received ${encoding}`)
  }

  const compressedSize = response.body.length

  const originalSize = Buffer.byteLength(rawBody)
  const reduction = 1 - compressedSize / originalSize

  if (reduction < 0.2) {
    throw new Error(
      `API response compression ineffective. Reduction ${(reduction * 100).toFixed(2)}%`
    )
  }

  console.log(
    `API response compression reduced size by ${(reduction * 100).toFixed(2)}% (original ${originalSize} bytes, compressed ${compressedSize} bytes).`
  )
}

async function main() {
  await ensureBuild()

  const server = startServer()

  try {
    await waitForServer(server)
    await verifyStaticCompression()
    await verifyApiCompression()
    console.log('Compression checks passed successfully.')
  } finally {
    if (!server.killed) {
      server.kill('SIGINT')
    }
    try {
      await once(server, 'exit')
    } catch (error) {
      // ignore errors while shutting down the server
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
