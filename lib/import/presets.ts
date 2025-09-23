import type { CsvImportFieldConfig, CsvImportEntity } from '@/types/import';
import type { DocumentType } from '@/types/documents';
import type { MemberRole } from '@/lib/data/members';

export const DOCUMENT_IMPORT_FIELDS: CsvImportFieldConfig[] = [
  {
    key: 'title',
    label: 'Document Title',
    required: true,
    description: 'Displayed in the documents list and activity feed.',
    example: 'Lease Agreement - Unit 2A',
  },
  {
    key: 'document_type',
    label: 'Document Type',
    required: true,
    description: 'Must match one of the supported document categories.',
    allowedValues: ['lease', 'addendum', 'insurance', 'maintenance', 'other'],
  },
  {
    key: 'tenant_email',
    label: 'Tenant Email',
    description: 'Used to associate the document with an existing tenant profile.',
    example: 'roommate@example.com',
  },
  {
    key: 'unit',
    label: 'Unit',
    description: 'Optional unit or apartment identifier.',
    example: 'Unit 4B',
  },
  {
    key: 'requires_signature',
    label: 'Requires Signature',
    description: 'Use TRUE when the document needs an electronic signature.',
    example: 'true',
  },
  {
    key: 'expires_at',
    label: 'Expires At',
    description: 'ISO date string indicating when the document expires.',
    example: '2025-03-31',
  },
];

export const MEMBER_IMPORT_FIELDS: CsvImportFieldConfig[] = [
  {
    key: 'full_name',
    label: 'Full Name',
    required: true,
    example: 'Alex Johnson',
  },
  {
    key: 'email',
    label: 'Email',
    required: true,
    description: 'Used for login invitations and notifications.',
    example: 'alex@example.com',
  },
  {
    key: 'role',
    label: 'Role',
    required: true,
    allowedValues: ['tenant', 'roommate', 'property_manager', 'admin'],
  },
  {
    key: 'unit',
    label: 'Unit',
    description: 'Optional unit identifier or room number.',
  },
  {
    key: 'phone',
    label: 'Phone Number',
    description: 'Optional mobile phone number for notifications.',
  },
];

export const IMPORT_FIELD_PRESETS: Record<CsvImportEntity, CsvImportFieldConfig[]> = {
  documents: DOCUMENT_IMPORT_FIELDS,
  members: MEMBER_IMPORT_FIELDS,
};

export const DOCUMENT_TYPE_VALUES: DocumentType[] = ['lease', 'addendum', 'insurance', 'maintenance', 'other'];

export const MEMBER_ROLE_VALUES: MemberRole[] = ['tenant', 'roommate', 'property_manager', 'admin'];
