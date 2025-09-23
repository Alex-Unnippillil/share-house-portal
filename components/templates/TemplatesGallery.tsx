'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'

import { createClient } from '@/utils/supabase-browser'
import { cn } from '@/lib/utils'
import type { TemplateContext, TemplateRecord, TemplateSelectionMeta } from '@/types/templates'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'

interface TemplatesGalleryProps {
  context: TemplateContext
  onSelect?: (template: TemplateRecord, meta: TemplateSelectionMeta) => void
  onClear?: () => void
  defaultTemplateId?: string | null
  className?: string
  emptyStateMessage?: string
}

export function TemplatesGallery({
  context,
  onSelect,
  onClear,
  defaultTemplateId,
  className,
  emptyStateMessage = 'No curated templates are available for this workflow yet.',
}: TemplatesGalleryProps) {
  const [templates, setTemplates] = useState<TemplateRecord[]>([])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(defaultTemplateId ?? null)
  const [error, setError] = useState<string | null>(null)
  const [hasAppliedDefault, setHasAppliedDefault] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setSelectedId(defaultTemplateId ?? null)
    setHasAppliedDefault(false)
  }, [defaultTemplateId])

  useEffect(() => {
    setHasAppliedDefault(false)
  }, [context])

  useEffect(() => {
    let mounted = true
    const supabase = createClient()

    setHasLoaded(false)
    setError(null)
    startTransition(async () => {
      const { data, error: fetchError } = await supabase
        .from('templates')
        .select('*')
        .eq('is_curated', true)
        .eq('context', context)
        .order('name', { ascending: true })

      if (!mounted) {
        return
      }

      if (fetchError) {
        console.error('Failed to load templates', fetchError)
        setError('We could not load curated templates right now.')
        setTemplates([])
        setHasLoaded(true)
        return
      }

      setError(null)
      setTemplates((data ?? []) as TemplateRecord[])
      setHasLoaded(true)
    })

    return () => {
      mounted = false
    }
  }, [context, startTransition])

  useEffect(() => {
    if (hasAppliedDefault || !defaultTemplateId) {
      return
    }

    const template = templates.find((item) => item.id === defaultTemplateId)
    if (!template) {
      return
    }

    setHasAppliedDefault(true)
    setSelectedId(defaultTemplateId)
    onSelect?.(template, { source: 'auto' })
  }, [defaultTemplateId, hasAppliedDefault, onSelect, templates])

  const filteredTemplates = useMemo(() => {
    if (!search.trim()) {
      return templates
    }

    const term = search.trim().toLowerCase()
    return templates.filter((template) => {
      return (
        template.name.toLowerCase().includes(term) ||
        (template.description ?? '').toLowerCase().includes(term) ||
        (template.category ?? '').toLowerCase().includes(term)
      )
    })
  }, [search, templates])

  const handleSelect = (template: TemplateRecord) => {
    setSelectedId(template.id)
    onSelect?.(template, { source: 'manual' })
  }

  const handleClear = () => {
    setSelectedId(null)
    onClear?.()
  }

  const showSkeleton = !hasLoaded && !error

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search templates"
          className="h-9"
        />
        <Button type="button" variant="ghost" size="sm" onClick={handleClear} disabled={!selectedId}>
          Clear
        </Button>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : showSkeleton ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-20 w-full animate-pulse rounded-md border border-dashed border-muted bg-muted/40"
            />
          ))}
        </div>
      ) : !filteredTemplates.length ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">{emptyStateMessage}</CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-56 rounded-md border">
          <div className="space-y-2 p-2">
            {filteredTemplates.map((template) => {
              const isSelected = selectedId === template.id
              return (
                <button
                  type="button"
                  key={template.id}
                  onClick={() => handleSelect(template)}
                  className={cn(
                    'w-full rounded-md border p-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-ring',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent hover:border-border/80 hover:bg-muted/60',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">{template.name}</p>
                      {template.description ? (
                        <p className="text-xs text-muted-foreground">{template.description}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={isSelected ? 'default' : 'outline'}>
                        {template.category ?? 'General'}
                      </Badge>
                      {isSelected ? <Badge variant="secondary">Selected</Badge> : null}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
