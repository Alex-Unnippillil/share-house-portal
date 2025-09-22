"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  createPdfJsLoadingParams,
  isFirstPageRenderFast,
} from "@/lib/documents/pdf-streaming"
import { cn } from "@/lib/utils"

type PdfJsModule = typeof import("pdfjs-dist/build/pdf")

interface PdfStreamViewerProps {
  documentId: string
  title: string
  fallbackUrl?: string | null
}

export function PdfStreamViewer({
  documentId,
  title,
  fallbackUrl,
}: PdfStreamViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [firstPageDuration, setFirstPageDuration] = useState<number | null>(null)
  const [firstPageFast, setFirstPageFast] = useState<boolean>(false)

  const pdfConfig = useMemo(
    () => createPdfJsLoadingParams(documentId),
    [documentId]
  )

  useEffect(() => {
    let isMounted = true
    let loadingTask: any

    async function loadPdf() {
      setLoading(true)
      setError(null)
      try {
        const pdfjsModule: PdfJsModule = await import("pdfjs-dist/build/pdf")
        await import("pdfjs-dist/build/pdf.worker.entry")

        const startTime = performance.now()
        loadingTask = pdfjsModule.getDocument(pdfConfig)
        const pdf = await loadingTask.promise
        if (!isMounted) {
          return
        }

        const page = await pdf.getPage(1)
        if (!isMounted) {
          return
        }

        const viewport = page.getViewport({ scale: 1.2 })
        const canvas = canvasRef.current
        const context = canvas?.getContext("2d")
        if (!canvas || !context) {
          throw new Error("Unable to initialise PDF canvas")
        }

        canvas.height = viewport.height
        canvas.width = viewport.width

        await page.render({ canvasContext: context, viewport }).promise
        if (!isMounted) {
          return
        }

        const endTime = performance.now()
        setFirstPageDuration(endTime - startTime)
        setFirstPageFast(isFirstPageRenderFast(startTime, endTime))
        setLoading(false)
      } catch (err) {
        console.error("Failed to load streaming PDF", err)
        if (!isMounted) {
          return
        }
        setError("We couldn't stream the preview. Use the download option instead.")
        setLoading(false)
      }
    }

    loadPdf()

    return () => {
      isMounted = false
      if (loadingTask) {
        loadingTask.destroy?.()
      }
    }
  }, [pdfConfig])

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-4 text-center">
        <p className="max-w-xs text-sm text-muted-foreground">{error}</p>
        {fallbackUrl && (
          <Button asChild variant="outline" size="sm">
            <a href={fallbackUrl} target="_blank" rel="noreferrer">
              Open original PDF
            </a>
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-col">
      <canvas
        ref={canvasRef}
        className={cn(
          "mx-auto h-full w-full max-w-full rounded-md bg-muted/10",
          loading && "opacity-0"
        )}
        aria-label={`${title} preview`}
      />
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 bg-background/80">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Preparing first page…</p>
        </div>
      )}
      {firstPageDuration !== null && !loading && (
        <div className="pointer-events-none absolute bottom-4 right-4 rounded-md bg-background/90 px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm">
          First page {Math.round(firstPageDuration)} ms · {firstPageFast ? "streaming" : "slow"}
        </div>
      )}
    </div>
  )
}
