import type { ReactElement } from 'react'
import { renderToPipeableStream } from 'react-dom/server'
import { PassThrough } from 'stream'

interface StreamResult {
  firstChunk: string
  completed: string
}

export async function renderComponentToStream(element: ReactElement): Promise<StreamResult> {
  const stream = new PassThrough()
  const chunks: string[] = []
  let resolveFirstChunk: ((value: string) => void) | null = null

  const firstChunkPromise = new Promise<string>((resolve, reject) => {
    resolveFirstChunk = resolve
    stream.once('error', reject)
  })

  const completedPromise = new Promise<string>((resolve, reject) => {
    stream.on('data', (chunk) => {
      const text = chunk.toString()
      chunks.push(text)
      if (resolveFirstChunk) {
        resolveFirstChunk(text)
        resolveFirstChunk = null
      }
    })
    stream.on('end', () => resolve(chunks.join('')))
    stream.on('error', reject)
  })

  const { pipe } = renderToPipeableStream(element, {
    onShellReady() {
      pipe(stream)
    },
    onShellError(error) {
      stream.destroy(error as Error)
    },
    onError() {
      // Errors are surfaced through the stream error event.
    },
  })

  const firstChunk = await firstChunkPromise
  const completed = await completedPromise

  return { firstChunk, completed }
}
