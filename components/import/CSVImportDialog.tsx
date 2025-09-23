'use client';

import { useMemo, useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { FileSpreadsheet, UploadCloud, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { importCsvAction } from '@/app/documents/actions/import-csv';
import { IMPORT_FIELD_PRESETS } from '@/lib/import/presets';
import type { CsvImportEntity, CsvImportFieldConfig, CsvImportPreview } from '@/types/import';
import { toast } from 'sonner';

const SKIP_VALUE = '__skip__';
const STEPS = ['Upload CSV', 'Map Columns', 'Review & Import'] as const;

type Step = 0 | 1 | 2;
type PreviewRow = NonNullable<CsvImportPreview['rows']>[number];

interface CSVImportDialogProps {
  entity: CsvImportEntity;
  triggerLabel?: string;
  title?: string;
  description?: string;
  onComplete?: (committedCount: number) => void;
}

export function CSVImportDialog({
  entity,
  triggerLabel = 'Import CSV',
  title,
  description,
  onComplete,
}: CSVImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(0);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<CsvImportPreview | null>(null);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isCommitting, setIsCommitting] = useState(false);
  const router = useRouter();

  const fields = IMPORT_FIELD_PRESETS[entity];

  const requiredFields = useMemo(() => fields.filter(field => field.required), [fields]);

  const resetState = () => {
    setStep(0);
    setFile(null);
    setHeaders([]);
    setMapping({});
    setPreview(null);
    setServerMessage(null);
    setErrorMessage(null);
    setIsCommitting(false);
  };

  const closeDialog = () => {
    setOpen(false);
    resetState();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;
    setFile(selectedFile);
    setErrorMessage(null);
    setServerMessage(null);
  };

  const analyzeFile = () => {
    if (!file) {
      setErrorMessage('Select a CSV file to continue.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('intent', 'analyze');
    formData.append('entity', entity);

    startTransition(async () => {
      const result = await importCsvAction(formData);
      if (!result.success) {
        setErrorMessage(result.error ?? 'Unable to read the uploaded CSV file.');
        return;
      }
      setHeaders(result.headers ?? []);
      setMapping(result.suggestedMapping ?? {});
      setServerMessage(result.message ?? null);
      setErrorMessage(null);
      setStep(1);
    });
  };

  const runPreview = () => {
    if (!file) {
      setErrorMessage('Upload a CSV file before mapping columns.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('intent', 'preview');
    formData.append('entity', entity);
    formData.append('mapping', JSON.stringify(mapping));

    startTransition(async () => {
      const result = await importCsvAction(formData);
      if (!result.success) {
        setErrorMessage(result.error ?? 'Unable to validate CSV rows.');
        setPreview(result.preview ?? null);
        return;
      }
      setPreview(result.preview ?? null);
      setServerMessage(result.message ?? null);
      setErrorMessage(null);
      setStep(2);
    });
  };

  const commitImport = async () => {
    if (!file) {
      setErrorMessage('Upload a CSV file before importing.');
      return;
    }

    setIsCommitting(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('intent', 'commit');
    formData.append('entity', entity);
    formData.append('mapping', JSON.stringify(mapping));

    try {
      const result = await importCsvAction(formData);
      setPreview(result.preview ?? null);
      setServerMessage(result.message ?? null);

      if (!result.success) {
        setErrorMessage(result.error ?? 'Unable to import CSV rows.');
        return;
      }

      toast.success(result.message ?? 'Import complete');
      setErrorMessage(null);
      setOpen(false);
      onComplete?.(result.committedCount ?? 0);
      router.refresh();
      resetState();
    } catch (error) {
      console.error('Failed to complete CSV import:', error);
      setErrorMessage('An unexpected error occurred while importing.');
    } finally {
      setIsCommitting(false);
    }
  };

  const mappedField = (field: CsvImportFieldConfig) => mapping[field.key] ?? SKIP_VALUE;

  const handleMappingChange = (field: CsvImportFieldConfig, value: string) => {
    setMapping(prev => {
      if (value === SKIP_VALUE) {
        const { [field.key]: _omitted, ...rest } = prev;
        return rest;
      }
      return { ...prev, [field.key]: value };
    });
  };

  const disableNext = useMemo(() => {
    if (step === 0) {
      return !file;
    }
    if (step === 1) {
      return requiredFields.some(field => !mapping[field.key]);
    }
    return false;
  }, [file, mapping, requiredFields, step]);

  const issueRows = useMemo<PreviewRow[]>(() => {
    if (!preview) {
      return [];
    }
    return preview.rows.filter(row => row.errors.length > 0 || row.conflict);
  }, [preview]);

  const renderStep = () => {
    if (step === 0) {
      return (
        <div className="space-y-4">
          <div className="rounded-lg border-2 border-dashed border-muted-foreground/40 p-6 text-center">
            <input
              id={`csv-upload-${entity}`}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor={`csv-upload-${entity}`} className="flex cursor-pointer flex-col items-center space-y-3">
              <UploadCloud className="size-12 text-muted-foreground" />
              <div className="space-y-1 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">
                  {file ? file.name : 'Click to browse or drag & drop a CSV file'}
                </p>
                <p>CSV files up to 5MB are supported.</p>
              </div>
            </label>
          </div>
          <p className="text-sm text-muted-foreground">
            The import wizard will validate your data and highlight any issues before committing changes.
          </p>
        </div>
      );
    }

    if (step === 1) {
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Map each required field to a column from your CSV. Optional fields can be skipped.
          </p>
          <div className="space-y-3">
            {fields.map(field => (
              <div key={field.key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{field.label}</span>
                      {field.required && <Badge variant="secondary">Required</Badge>}
                    </div>
                    {field.description && (
                      <p className="text-xs text-muted-foreground">{field.description}</p>
                    )}
                    {field.allowedValues && field.allowedValues.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Allowed values: {field.allowedValues.join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="w-48">
                    <Select value={mappedField(field)} onValueChange={value => handleMappingChange(field, value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SKIP_VALUE} disabled={field.required}>
                          Do not import
                        </SelectItem>
                        {headers.map(header => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {preview ? (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <SummaryCard label="Total rows" value={preview.summary.totalRows} icon={<FileSpreadsheet className="size-4" />} />
              <SummaryCard label="Ready to import" value={preview.summary.validRows} tone="success" />
              <SummaryCard label="Validation issues" value={preview.summary.invalidRows} tone="warning" />
              <SummaryCard label="Conflicts detected" value={preview.summary.conflictRows} tone="destructive" />
            </div>
            {issueRows.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <AlertTriangle className="size-4 text-destructive" />
                  {issueRows.length} row{issueRows.length > 1 ? 's' : ''} require attention before importing.
                </div>
                <ScrollArea className="max-h-60 rounded-md border">
                  <div className="divide-y">
                    {issueRows.map(row => (
                      <div key={row.rowNumber} className="space-y-2 p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Row {row.rowNumber}</span>
                          {row.conflict && <Badge variant="destructive">Conflict</Badge>}
                        </div>
                        {row.errors.length > 0 && (
                          <div className="space-y-1">
                            {row.errors.map((error, index) => (
                              <p key={index} className="text-destructive">
                                • {error}
                              </p>
                            ))}
                          </div>
                        )}
                        {row.conflict && <p className="text-destructive">• {row.conflict}</p>}
                        {row.warnings.length > 0 && (
                          <div className="space-y-1 text-amber-600">
                            {row.warnings.map((warning, index) => (
                              <p key={index}>• {warning}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <p className="text-xs text-muted-foreground">
                  The preview displays a limited subset of rows to keep the review manageable.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
                <CheckCircle2 className="size-4 text-primary" />
                All rows look good. Confirm the import to create records.
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Generate a preview to review validation results.
          </p>
        )}
      </div>
    );
  };

  const dialogTitle = title ?? `Import ${entity === 'documents' ? 'documents' : 'members'} via CSV`;
  const dialogDescription =
    description ??
    (entity === 'documents'
      ? 'Upload a CSV containing document metadata to create records in bulk.'
      : 'Upload a CSV containing member details to invite roommates in bulk.');

  return (
    <Dialog
      open={open}
      onOpenChange={nextOpen => {
        setOpen(nextOpen);
        if (!nextOpen) {
          resetState();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileSpreadsheet className="size-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <StepIndicator currentStep={step} />
          {serverMessage && <p className="text-sm text-muted-foreground">{serverMessage}</p>}
          {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
          {renderStep()}
        </div>
        <DialogFooter className="justify-between">
          <Button variant="ghost" onClick={closeDialog} disabled={isPending || isCommitting}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (step === 2) {
                    setStep(1);
                  } else {
                    setStep(prev => (prev > 0 ? ((prev - 1) as Step) : prev));
                  }
                }}
                disabled={isPending || isCommitting}
              >
                Back
              </Button>
            )}
            {step < 2 && (
              <Button
                type="button"
                onClick={step === 0 ? analyzeFile : runPreview}
                disabled={disableNext || isPending}
              >
                {isPending ? 'Loading…' : 'Continue'}
              </Button>
            )}
            {step === 2 && (
              <Button type="button" onClick={commitImport} disabled={isCommitting || isPending || !preview}>
                {isCommitting ? 'Importing…' : 'Confirm Import'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StepIndicator({ currentStep }: { currentStep: Step }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
      {STEPS.map((label, index) => {
        const active = index === currentStep;
        const completed = index < currentStep;
        return (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={`flex size-8 items-center justify-center rounded-full border text-sm ${
                completed
                  ? 'border-primary bg-primary text-primary-foreground'
                  : active
                  ? 'border-primary text-primary'
                  : 'border-muted-foreground/30 text-muted-foreground'
              }`}
            >
              {index + 1}
            </div>
            <span className={active ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
            {index < STEPS.length - 1 && <Separator className="flex-1" />}
          </div>
        );
      })}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  tone = 'default',
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'destructive';
}) {
  const toneClasses = {
    default: 'border-border',
    success: 'border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400',
    warning: 'border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400',
    destructive: 'border-destructive/40 bg-destructive/5 text-destructive',
  } as const;

  return (
    <Card className={`border ${toneClasses[tone]}`}>
      <CardContent className="flex flex-col gap-1 p-4">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2 text-lg font-semibold">
          {icon}
          <span>{value}</span>
        </div>
      </CardContent>
    </Card>
  );
}
