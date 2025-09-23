'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FileSpreadsheet, Loader2, ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react';

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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDocumentPermissions } from '@/hooks/use-document-permissions';
import { cn } from '@/lib/utils';
import {
  commitDocumentImportAction,
  previewDocumentImportAction,
} from '../actions';

import type {
  DocumentImportField,
  DocumentImportPlan,
} from '@/lib/documents/import';

type Step = 'upload' | 'map' | 'preview';

type FieldConfig = {
  field: DocumentImportField;
  label: string;
  required?: boolean;
  description?: string;
};

const FIELD_CONFIGS: FieldConfig[] = [
  { field: 'title', label: 'Document Title', required: true },
  { field: 'document_type', label: 'Type', required: true },
  { field: 'status', label: 'Status', required: true },
  { field: 'description', label: 'Description' },
  { field: 'tenant_email', label: 'Tenant Email', description: 'Used to match existing profiles.' },
  { field: 'unit_id', label: 'Unit ID' },
  { field: 'requires_signature', label: 'Requires Signature' },
  { field: 'expires_at', label: 'Expires At', description: 'Accepts ISO or yyyy-mm-dd format.' },
  { field: 'document_id', label: 'Document ID', description: 'Provide to update an existing record.' },
  { field: 'file_url', label: 'File URL' },
];

const FIELD_MATCHES: Record<DocumentImportField, string[]> = {
  title: ['title', 'document title', 'name'],
  document_type: ['type', 'document type'],
  status: ['status', 'document status'],
  description: ['description', 'notes', 'details'],
  tenant_email: ['tenant email', 'email', 'tenant'],
  unit_id: ['unit id', 'unit', 'unit number'],
  requires_signature: ['requires signature', 'signature', 'sign'],
  expires_at: ['expires', 'expiration', 'expiry', 'expires at'],
  document_id: ['id', 'document id'],
  file_url: ['file url', 'url', 'link'],
};

type MappingState = Record<DocumentImportField, string | null>;

const createEmptyMapping = (): MappingState => ({
  title: null,
  document_type: null,
  status: null,
  description: null,
  tenant_email: null,
  unit_id: null,
  requires_signature: null,
  expires_at: null,
  document_id: null,
  file_url: null,
});

export function ImportDocumentsDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<MappingState>(() => createEmptyMapping());
  const [preview, setPreview] = useState<DocumentImportPlan | null>(null);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPreviewPending, startPreview] = useTransition();
  const [isCommitPending, startCommit] = useTransition();
  const permissions = useDocumentPermissions();
  const router = useRouter();

  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open]);

  if (!permissions.canUploadDocuments) {
    return null;
  }

  const mappingOptions = useMemo(() => headers, [headers]);

  const validRowCount = preview?.summary.valid ?? 0;

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;

    try {
      const text = await selected.text();
      const extractedHeaders = extractHeadersFromCsv(text);
      if (extractedHeaders.length === 0) {
        toast.error('The CSV is missing a header row.');
        return;
      }

      setFile(selected);
      setHeaders(extractedHeaders);
      setMapping(createInitialMapping(extractedHeaders));
      setPreview(null);
      setError(null);
      setStep('map');
    } catch (readError) {
      console.error('Failed to read CSV file:', readError);
      toast.error('Unable to read the selected file.');
    }
  };

  const handlePreview = () => {
    if (!file) {
      setError('Select a CSV file to continue.');
      return;
    }

    const missingRequired = FIELD_CONFIGS.filter(
      (config) => config.required && !mapping[config.field]
    );

    if (missingRequired.length > 0) {
      setError(`Map required fields: ${missingRequired.map((item) => item.label).join(', ')}.`);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(mapping));

    startPreview(async () => {
      setError(null);
      const result = await previewDocumentImportAction(formData);

      if (!result.success || !result.data) {
        setError(result.error ?? 'Failed to generate preview.');
        return;
      }

      setPreview(result.data.plan);
      setPreviewHeaders(result.data.headers);
      setStep('preview');
    });
  };

  const handleCommit = () => {
    if (!file || !preview) {
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(mapping));

    startCommit(async () => {
      const result = await commitDocumentImportAction(formData);

      if (!result.success || !result.data) {
        toast.error(result.error ?? 'Import failed.');
        return;
      }

      setPreview(result.data.plan);
      toast.success(`Imported ${result.data.inserted} new and updated ${result.data.updated} documents.`);
      setOpen(false);
      router.refresh();
    });
  };

  const resetState = () => {
    setStep('upload');
    setFile(null);
    setHeaders([]);
    setMapping(createEmptyMapping());
    setPreview(null);
    setPreviewHeaders([]);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileSpreadsheet className="mr-2 size-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import documents from CSV</DialogTitle>
          <DialogDescription>
            Upload a spreadsheet to create or update document records. Map columns to Roomsily fields and review validation feedback before committing changes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <StepTracker step={step} validRows={validRowCount} />

          {step === 'upload' && (
            <section className="space-y-4">
              <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 p-6 text-center">
                <input
                  id="documents-import-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="documents-import-file" className="cursor-pointer">
                  <FileSpreadsheet className="mx-auto mb-3 size-12 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload a CSV file or drag and drop.
                  </p>
                  <p className="text-xs text-muted-foreground">Include a header row with column names.</p>
                </label>
              </div>

              {file && (
                <div className="rounded-md border bg-muted/40 p-3 text-sm">
                  <div className="font-medium text-foreground">Selected file</div>
                  <div className="text-muted-foreground">{file.name}</div>
                </div>
              )}
            </section>
          )}

          {step === 'map' && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold">Map CSV columns</h3>
                  <p className="text-sm text-muted-foreground">Match your CSV headers to Roomsily fields.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setStep('upload')}>
                  <ArrowLeft className="mr-2 size-4" />
                  Change file
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {FIELD_CONFIGS.map((config) => (
                  <div key={config.field} className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      {config.label}
                      {config.required && <Badge className="bg-primary/10 text-primary" variant="secondary">Required</Badge>}
                    </Label>
                    <Select
                      value={mapping[config.field] ?? '___none___'}
                      onValueChange={(value) =>
                        setMapping((prev) => ({
                          ...prev,
                          [config.field]: value === '___none___' ? null : value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="___none___">No column</SelectItem>
                        {mappingOptions.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {config.description && (
                      <p className="text-xs text-muted-foreground">{config.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {step === 'preview' && preview && (
            <section className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold">Import preview</h3>
                  <p className="text-sm text-muted-foreground">
                    Review validation results. Rows with issues stay in draft until corrected.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setStep('map')}>
                  <ArrowLeft className="mr-2 size-4" />
                  Adjust mapping
                </Button>
              </div>

              <SummaryBar plan={preview} />

              <ScrollArea className="max-h-72 rounded-md border">
                <div className="divide-y">
                  {preview.rows.map((row) => (
                    <div key={row.index} className="space-y-3 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <span>Row {row.index + 2}</span>
                            {row.payload?.title && (
                              <span className="text-muted-foreground">· {row.payload.title}</span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>{row.action === 'create' ? 'Create' : 'Update existing document'}</span>
                            {row.payload?.status && (
                              <Badge variant="secondary" className="bg-primary/10 text-primary">
                                Status: {row.payload.status.replace('_', ' ')}
                              </Badge>
                            )}
                            {row.payload?.tenant_email && (
                              <Badge variant="outline">Tenant: {row.payload.tenant_email}</Badge>
                            )}
                          </div>
                        </div>
                        <Badge variant={row.errors.length > 0 ? 'destructive' : 'secondary'}>
                          {row.errors.length > 0 ? 'Needs attention' : 'Ready'}
                        </Badge>
                      </div>

                      {row.errors.length > 0 ? (
                        <ul className="space-y-1 text-sm text-destructive">
                          {row.errors.map((issue, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <AlertTriangle className="mt-0.5 size-4" />
                              <span>{issue}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          <CheckCircle2 className="mr-2 inline size-4 text-primary" />
                          This row will {row.action === 'create' ? 'create a new document.' : 'update the existing document.'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                Headers matched: {previewHeaders.join(', ')}
              </div>
            </section>
          )}

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Need help? Ensure your CSV includes a header row and UTF-8 encoding.
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {step === 'upload' ? 'Close' : 'Cancel'}
            </Button>
            {step === 'map' && (
              <Button onClick={handlePreview} disabled={isPreviewPending || !file}>
                {isPreviewPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Generate preview
              </Button>
            )}
            {step === 'preview' && (
              <Button
                onClick={handleCommit}
                disabled={isCommitPending || !preview || preview.summary.valid === 0}
              >
                {isCommitPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Confirm import
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StepTracker({ step, validRows }: { step: Step; validRows: number }) {
  const steps: { id: Step; label: string }[] = [
    { id: 'upload', label: 'Upload CSV' },
    { id: 'map', label: 'Map columns' },
    { id: 'preview', label: 'Review & confirm' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      {steps.map((item, index) => {
        const isActive = step === item.id;
        const isComplete = steps.findIndex((s) => s.id === step) > index;
        return (
          <div key={item.id} className="flex items-center gap-2">
            <Badge
              className={cn(
                'px-3 py-1 font-medium',
                isActive && 'bg-primary text-primary-foreground',
                isComplete && !isActive && 'bg-primary/10 text-primary',
              )}
            >
              {index + 1}
            </Badge>
            <span className={cn('text-muted-foreground', isActive && 'text-foreground font-semibold')}>
              {item.label}
            </span>
            {index < steps.length - 1 && <Separator orientation="vertical" className="mx-1 h-6" />}
          </div>
        );
      })}
      {step === 'preview' && (
        <Badge variant="outline" className="border-primary/30 text-xs text-primary">
          {validRows} valid {validRows === 1 ? 'row' : 'rows'}
        </Badge>
      )}
    </div>
  );
}

function SummaryBar({ plan }: { plan: DocumentImportPlan }) {
  const items = [
    { label: 'Total rows', value: plan.summary.total },
    { label: 'Ready to create', value: plan.summary.creates },
    { label: 'Ready to update', value: plan.summary.updates },
    { label: 'Needs attention', value: plan.summary.invalid },
  ];

  return (
    <div className="grid gap-3 rounded-md border bg-muted/40 p-3 text-sm sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="text-xs text-muted-foreground">{item.label}</div>
          <div className="text-base font-semibold text-foreground">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function extractHeadersFromCsv(text: string): string[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return [];
  }

  return splitCsvLine(lines[0]).map((header) => header.trim());
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
}

function createInitialMapping(headers: string[]): MappingState {
  const mapping = createEmptyMapping();
  const used = new Set<string>();

  headers.forEach((header) => {
    if (used.has(header)) {
      return;
    }
    const normalised = header.trim().toLowerCase();
    for (const field of FIELD_CONFIGS) {
      if (mapping[field.field]) continue;
      const matches = FIELD_MATCHES[field.field] ?? [];
      if (matches.some((target) => normalised === target || normalised.includes(target))) {
        mapping[field.field] = header;
        used.add(header);
        break;
      }
    }
  });

  return mapping;
}
