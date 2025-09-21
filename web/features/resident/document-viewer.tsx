'use client'

import { useState } from 'react'

import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useResidentDocuments } from './hooks'

const formatUpdatedAt = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))

export const ResidentDocumentViewer = () => {
  const { data, isLoading, isError, error } = useResidentDocuments()
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)

  return (
    <Card aria-labelledby="documents-heading">
      <CardHeader>
        <CardTitle id="documents-heading" className="text-xl">
          Resident documents
        </CardTitle>
        <CardDescription>Access lease agreements, policies, and amenity forms in one place.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
            Loading documents…
          </p>
        ) : isError ? (
          <p role="alert" className="text-sm text-destructive">
            {(error as Error).message || 'Unable to load documents.'}
          </p>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents are available yet.</p>
        ) : (
          <ScrollArea className="max-h-80">
            <ul className="space-y-4 pr-2">
              {data.map(document => (
                <li key={document.id} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{document.title}</p>
                    <p className="text-xs text-muted-foreground">{document.category} · Updated {formatUpdatedAt(document.updatedAt)}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{document.summary}</p>
                  </div>
                  <Dialog
                    open={selectedDocumentId === document.id}
                    onOpenChange={open => setSelectedDocumentId(open ? document.id : null)}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </DialogTrigger>
                    <DialogContent aria-describedby={`document-description-${document.id}`}>
                      <DialogHeader>
                        <DialogTitle>{document.title}</DialogTitle>
                        <DialogDescription id={`document-description-${document.id}`}>
                          {document.category} · Last updated {formatUpdatedAt(document.updatedAt)}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p>{document.summary}</p>
                        <p>
                          You can download the original document using the link below. Opening in a new tab helps preserve your
                          progress in the portal.
                        </p>
                      </div>
                      <div className="pt-4">
                        <a
                          className={cn(buttonVariants({ variant: 'default' }), 'w-full justify-center')}
                          href={document.url}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          Download document
                        </a>
                      </div>
                    </DialogContent>
                  </Dialog>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
