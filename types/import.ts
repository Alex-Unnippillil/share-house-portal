export type CsvImportEntity = 'documents' | 'members';

export interface CsvImportFieldConfig {
  /** Internal key used to map values */
  key: string;
  /** Human friendly label */
  label: string;
  /** Whether this field must be provided */
  required?: boolean;
  /** Optional helper copy rendered in the wizard */
  description?: string;
  /** Suggested example value displayed to the user */
  example?: string;
  /** Optional list of allowed values displayed when relevant */
  allowedValues?: string[];
}

export type CsvColumnMapping = Record<string, string | null | undefined>;

export interface CsvPreviewRow {
  /** Row index starting at 1 for human readability */
  rowNumber: number;
  /** Raw values keyed by CSV header */
  raw: Record<string, string>;
  /** Normalised values keyed by field key */
  values: Record<string, string>;
  /** Validation failures that prevent committing */
  errors: string[];
  /** Issues the user should review but that do not block commit */
  warnings: string[];
  /** Conflict reason if the row duplicates an existing record */
  conflict?: string;
}

export interface CsvImportSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  conflictRows: number;
  duplicateRows: number;
}

export interface CsvImportPreview {
  rows: CsvPreviewRow[];
  summary: CsvImportSummary;
}

export interface CsvImportResponse {
  success: boolean;
  /** Column headers discovered from the uploaded CSV */
  headers?: string[];
  /** Suggested field mapping derived from header names */
  suggestedMapping?: Record<string, string>;
  /** Validation preview for the provided file/mapping */
  preview?: CsvImportPreview;
  /** Number of rows committed during the import */
  committedCount?: number;
  message?: string;
  error?: string;
}
