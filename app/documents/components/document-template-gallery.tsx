'use client';

import { useEffect, useState, useTransition } from 'react';
import { Sparkles, FileText } from 'lucide-react';

import { getDocumentTemplatesAction } from '../actions';
import type { DocumentTemplate } from '@/types/documents';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type DocumentTemplateGalleryProps = {
  onTemplateSelect: (templateId: string) => void;
  selectedTemplateId?: string | null;
  disabled?: boolean;
  onTemplatesLoaded?: (templates: DocumentTemplate[]) => void;
  className?: string;
};

export function DocumentTemplateGallery({
  onTemplateSelect,
  selectedTemplateId,
  disabled = false,
  onTemplatesLoaded,
  className,
}: DocumentTemplateGalleryProps) {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let isMounted = true;

    startTransition(() => {
      getDocumentTemplatesAction()
        .then((result) => {
          if (!isMounted) {
            return;
          }

          if (result.success && Array.isArray(result.data)) {
            setTemplates(result.data);
            setError(null);
            onTemplatesLoaded?.(result.data);
          } else {
            setTemplates([]);
            setError(result.error ?? 'Unable to load document templates.');
            onTemplatesLoaded?.([]);
          }
        })
        .catch((err) => {
          if (!isMounted) {
            return;
          }

          console.error('Failed to load document templates', err);
          setTemplates([]);
          setError('Unable to load document templates.');
          onTemplatesLoaded?.([]);
        });
    });

    return () => {
      isMounted = false;
    };
  }, [startTransition, onTemplatesLoaded]);

  const loading = isPending && templates.length === 0;
  const isEmpty = !loading && templates.length === 0 && !error;

  return (
    <section className={cn('space-y-3', className)} aria-label="Document templates">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1 text-sm font-medium text-foreground">
            <Sparkles className="size-4 text-primary" />
            Start from a template
          </p>
          <p className="text-xs text-muted-foreground">
            Reuse curated Documenso and Supabase templates to move faster.
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`template-skeleton-${index}`}
              className="h-32 animate-pulse rounded-xl border border-dashed border-muted bg-muted/40"
            />
          ))}
        </div>
      ) : isEmpty ? (
        <p className="text-sm text-muted-foreground">
          No templates available yet. Upload a document to create your first template.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {templates.map((template) => {
            const isSelected = selectedTemplateId === template.id;
            const tags = template.tags?.length ? template.tags : [];

            return (
              <button
                key={template.id}
                type="button"
                onClick={() => onTemplateSelect(template.id)}
                disabled={disabled}
                className="text-left"
                aria-pressed={isSelected}
              >
                <Card
                  className={cn(
                    'h-full transition-all',
                    disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-primary/40 hover:shadow-sm',
                    isSelected ? 'border-primary shadow-sm ring-2 ring-primary/40' : 'border-muted'
                  )}
                >
                  <CardHeader className="space-y-3 pb-4">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <FileText className="size-4 text-muted-foreground" />
                        {template.title}
                      </CardTitle>
                      <Badge variant="outline" className="uppercase tracking-wide text-[10px]">
                        {template.source}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-3">
                      {template.description ?? 'Reusable document template.'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2 pb-4">
                    <div className="text-xs font-medium text-muted-foreground">
                      Type: <span className="capitalize text-foreground">{template.document_type}</span>
                    </div>
                    {template.recommended_for ? (
                      <div className="text-xs text-muted-foreground">
                        Ideal for {template.recommended_for}
                      </div>
                    ) : null}
                    {tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px]">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    {template.autoCreateDraft ? (
                      <div className="text-xs font-medium text-primary">
                        Selecting this template will create a draft automatically.
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        Selecting this template will prefill the upload form.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
