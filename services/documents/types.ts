export type DocumentScanStatus = 'pending' | 'clean' | 'infected';

export type PermissionLevel = 'read' | 'write' | 'delete';

export interface DocumentRecord {
  id: string;
  name: string;
  category: string;
  unitId: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  latestVersionId?: string;
  metadata?: Record<string, unknown>;
}

export interface DocumentVersion {
  versionId: string;
  documentId: string;
  versionNumber: number;
  s3Key: string;
  checksum?: string;
  createdAt: Date;
  createdBy: string;
  status: DocumentScanStatus;
  metadata?: Record<string, unknown>;
  scannedAt?: Date | null;
  scanDetails?: Record<string, unknown>;
}

export interface DocumentPermission {
  documentId: string;
  role: string;
  unitId: string | null;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  grantedBy: string;
  grantedAt: Date;
}

export type AuditAction =
  | 'UPLOAD_REQUESTED'
  | 'DOWNLOAD_REQUESTED'
  | 'ACCESS_DENIED'
  | 'SCAN_TRIGGERED'
  | 'SCAN_RESULT'
  | 'PERMISSION_UPDATED';

export interface AuditLogEntry {
  id: string;
  documentId: string;
  versionId?: string;
  actorId: string;
  action: AuditAction;
  timestamp: Date;
  details?: Record<string, unknown>;
}

export interface UploadRequest {
  userId: string;
  role: string;
  unitId?: string | null;
  fileName: string;
  contentType: string;
  contentLength: number;
  category?: string;
  documentId?: string;
  metadata?: Record<string, unknown>;
  checksum?: string;
  expiresInSeconds?: number;
}

export interface UploadResponse {
  documentId: string;
  versionId: string;
  key: string;
  uploadUrl: string;
  expiresAt: Date;
}

export interface DownloadRequest {
  documentId: string;
  userId: string;
  role: string;
  unitId?: string | null;
  versionId?: string;
  expiresInSeconds?: number;
}

export interface DownloadResponse {
  documentId: string;
  versionId: string;
  url: string;
  expiresAt: Date;
}

export interface CompleteUploadRequest {
  documentId: string;
  versionId: string;
  actorId: string;
  context?: Record<string, unknown>;
}

export interface GrantPermissionRequest {
  documentId: string;
  role: string;
  unitId?: string | null;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
}
