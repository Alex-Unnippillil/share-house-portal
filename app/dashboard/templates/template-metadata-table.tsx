'use client'

import { useMemo, useState, useTransition } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { TemplateRecord } from '@/types/templates'
import { toast } from 'sonner'

import { updateTemplateMetadataAction } from './actions'

interface TemplateMetadataTableProps {
  templates: TemplateRecord[]
}

interface TemplateFormState {
  name: string
  description: string
  category: string
  is_curated: boolean
}

export function TemplateMetadataTable({ templates }: TemplateMetadataTableProps) {
  if (!templates.length) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">
          No templates found. Create a template in Supabase to start curating onboarding and document
          defaults.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {templates.map((template) => (
        <TemplateMetadataCard key={template.id} template={template} />
      ))}
    </div>
  )
}

function TemplateMetadataCard({ template }: { template: TemplateRecord }) {
  const [formState, setFormState] = useState<TemplateFormState>({
    name: template.name,
    description: template.description ?? '',
    category: template.category ?? '',
    is_curated: template.is_curated,
  })
  const [isPending, startTransition] = useTransition()

  const formattedUpdatedAt = useMemo(() => {
    const timestamp = template.updated_at ?? template.created_at
    if (!timestamp) {
      return 'Not yet updated'
    }

    try {
      return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(timestamp))
    } catch (error) {
      console.error('Failed to format timestamp', error)
      return timestamp
    }
  }, [template.created_at, template.updated_at])

  const formValuesPreview = useMemo(() => {
    try {
      return JSON.stringify(template.form_values, null, 2)
    } catch (error) {
      console.error('Failed to stringify template values', error)
      return String(template.form_values)
    }
  }, [template.form_values])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    startTransition(async () => {
      try {
        await updateTemplateMetadataAction({
          id: template.id,
          name: formState.name,
          description: formState.description || null,
          category: formState.category || null,
          is_curated: formState.is_curated,
        })
        toast.success('Template updated')
      } catch (error) {
        console.error('Failed to update template metadata', error)
        toast.error(
          error instanceof Error ? error.message : 'An unexpected error occurred while updating the template.',
        )
      }
    })
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-0">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{template.name}</CardTitle>
            <CardDescription>
              Context: <span className="font-medium text-foreground">{template.context}</span> • Last
              updated {formattedUpdatedAt}
            </CardDescription>
          </div>
          <Badge variant={formState.is_curated ? 'default' : 'outline'}>
            {formState.is_curated ? 'Curated' : 'Hidden'}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`template-name-${template.id}`}>Template name</Label>
              <Input
                id={`template-name-${template.id}`}
                value={formState.name}
                onChange={(event) => setFormState((previous) => ({ ...previous, name: event.target.value }))}
                placeholder="Lease renewal checklist"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`template-category-${template.id}`}>Category</Label>
              <Input
                id={`template-category-${template.id}`}
                value={formState.category}
                onChange={(event) =>
                  setFormState((previous) => ({ ...previous, category: event.target.value }))
                }
                placeholder="Lease"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`template-description-${template.id}`}>Description</Label>
            <Textarea
              id={`template-description-${template.id}`}
              value={formState.description}
              onChange={(event) =>
                setFormState((previous) => ({ ...previous, description: event.target.value }))
              }
              rows={3}
              placeholder="Explain when and how to use this template."
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`template-curated-${template.id}`}
              checked={formState.is_curated}
              onCheckedChange={(checked) =>
                setFormState((previous) => ({ ...previous, is_curated: Boolean(checked) }))
              }
            />
            <Label htmlFor={`template-curated-${template.id}`} className="text-sm">
              Show in curated gallery
            </Label>
          </div>
          <div className="space-y-1">
            <Label className="text-sm font-medium">Prefill JSON</Label>
            <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">
              <code>{formValuesPreview}</code>
            </pre>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap items-center justify-end gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving...' : 'Save changes'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
