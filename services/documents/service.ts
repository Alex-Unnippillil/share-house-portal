import { randomUUID } from 'node:crypto';

import {
  DocumentAccessError,
  DocumentNotFoundError,
  DocumentScanFailedError,
  DocumentScanPendingError,
  DocumentVersionNotFoundError,
} from './errors';
import type {
  AuditLogEntry,
  CompleteUploadRequest,
  DocumentPermission,
  DocumentRecord,
  DocumentScanStatus,
  DocumentVersion,
  DownloadRequest,
  DownloadResponse,
  GrantPermissionRequest,
  PermissionLevel,
  UploadRequest,
  UploadResponse,
} from './types';
import type { AntivirusScanner } from './antivirus';
import type { DocumentRepository } from './repository';
import type { ObjectSigner } from './s3';
import type { AuditAction } from './types';

const normalizeUnitId = (unitId?: string | null): string | null => {
  if (!unitId) {
    return null;
  }

  if (unitId.toLowerCase() === 'all') {
    return null;
  }

  return unitId;
};

const capitalize = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

interface DocumentServiceDependencies {
  repository: DocumentRepository;
  signer: ObjectSigner;
  scanner: AntivirusScanner;
  bucket: string;
  defaultUploadExpirySeconds?: number;
  defaultDownloadExpirySeconds?: number;
}

export class DocumentService {
  private readonly repository: DocumentRepository;

  private readonly signer: ObjectSigner;

  private readonly scanner: AntivirusScanner;

  private readonly bucket: string;

  private readonly defaultUploadExpirySeconds: number;

  private readonly defaultDownloadExpirySeconds: number;

  constructor({
    repository,
    signer,
    scanner,
    bucket,
    defaultUploadExpirySeconds = 900,
    defaultDownloadExpirySeconds = 900,
  }: DocumentServiceDependencies) {
    this.repository = repository;
    this.signer = signer;
    this.scanner = scanner;
    this.bucket = bucket;
    this.defaultUploadExpirySeconds = defaultUploadExpirySeconds;
    this.defaultDownloadExpirySeconds = defaultDownloadExpirySeconds;
  }

  async requestUpload(request: UploadRequest): Promise<UploadResponse> {
    const normalizedUnit = normalizeUnitId(request.unitId);
    const now = new Date();
    let document: DocumentRecord | null = null;

    if (request.documentId) {
      document = await this.repository.getDocumentById(request.documentId);
      if (!document) {
        throw new DocumentNotFoundError(request.documentId);
      }

      await this.ensurePermission(document, request.role, normalizedUnit, 'write', request.userId);
    }

    if (!document) {
      const documentId = request.documentId ?? randomUUID();
      document = {
        id: documentId,
        name: request.fileName,
        category: request.category ?? 'uncategorized',
        unitId: normalizedUnit,
        createdBy: request.userId,
        createdAt: now,
        updatedAt: now,
        latestVersionId: undefined,
        metadata: request.metadata,
      };
      await this.repository.createDocument(document);

      const permission: DocumentPermission = {
        documentId: documentId,
        role: request.role,
        unitId: normalizedUnit,
        canRead: true,
        canWrite: true,
        canDelete: true,
        grantedBy: request.userId,
        grantedAt: now,
      };
      await this.repository.savePermission(permission);
    } else {
      if (request.category && request.category !== document.category) {
        document.category = request.category;
      }

      if (normalizedUnit !== undefined && normalizedUnit !== document.unitId) {
        document.unitId = normalizedUnit;
      }

      document.updatedAt = now;
      await this.repository.updateDocument(document);
    }

    const versions = await this.repository.listDocumentVersions(document.id);
    const versionNumber = versions.length + 1;
    const versionId = randomUUID();
    const key = `documents/${document.id}/v${versionNumber}/${request.fileName}`;

    const version: DocumentVersion = {
      versionId,
      documentId: document.id,
      versionNumber,
      s3Key: key,
      checksum: request.checksum,
      createdAt: now,
      createdBy: request.userId,
      status: 'pending',
      metadata: request.metadata,
      scannedAt: null,
    };

    await this.repository.addVersion(version);

    document.latestVersionId = versionId;
    document.updatedAt = now;
    await this.repository.updateDocument(document);

    const signed = await this.signer.createUploadUrl(
      key,
      request.contentType,
      request.expiresInSeconds ?? this.defaultUploadExpirySeconds,
    );

    await this.writeAuditLog(document.id, versionId, request.userId, 'UPLOAD_REQUESTED', {
      fileName: request.fileName,
      contentType: request.contentType,
      versionNumber,
      category: document.category,
      unitId: normalizedUnit,
    });

    return {
      documentId: document.id,
      versionId,
      key,
      uploadUrl: signed.url,
      expiresAt: signed.expiresAt,
    };
  }

  async completeUpload(request: CompleteUploadRequest): Promise<DocumentScanStatus> {
    const document = await this.repository.getDocumentById(request.documentId);
    if (!document) {
      throw new DocumentNotFoundError(request.documentId);
    }

    const version = await this.repository.getVersionById(document.id, request.versionId);
    if (!version) {
      throw new DocumentVersionNotFoundError(document.id, request.versionId);
    }

    await this.writeAuditLog(
      document.id,
      version.versionId,
      request.actorId,
      'SCAN_TRIGGERED',
      {
        key: version.s3Key,
        context: request.context,
      },
    );

    const result = await this.scanner.triggerScan(this.bucket, version.s3Key, {
      ...request.context,
      documentId: document.id,
      versionId: version.versionId,
    });

    const status: DocumentScanStatus =
      result.status === 'infected'
        ? 'infected'
        : result.status === 'clean'
          ? 'clean'
          : 'pending';

    version.status = status;
    version.scannedAt = result.completedAt ?? (status === 'pending' ? null : new Date());
    version.scanDetails = {
      ...(version.scanDetails ?? {}),
      ...result.details,
      scanId: result.scanId ?? (version.scanDetails?.scanId as string | undefined),
    };

    await this.repository.updateDocumentVersion(version);

    await this.writeAuditLog(document.id, version.versionId, request.actorId, 'SCAN_RESULT', {
      status,
      scanId: result.scanId,
    });

    return status;
  }

  async requestDownload(request: DownloadRequest): Promise<DownloadResponse> {
    const document = await this.repository.getDocumentById(request.documentId);
    if (!document) {
      throw new DocumentNotFoundError(request.documentId);
    }

    const normalizedUnit = normalizeUnitId(request.unitId);
    await this.ensurePermission(document, request.role, normalizedUnit, 'read', request.userId);

    const versionId = request.versionId ?? document.latestVersionId;
    if (!versionId) {
      throw new DocumentVersionNotFoundError(document.id, 'latest');
    }

    const version = await this.repository.getVersionById(document.id, versionId);
    if (!version) {
      throw new DocumentVersionNotFoundError(document.id, versionId);
    }

    if (version.status === 'pending') {
      throw new DocumentScanPendingError(document.id, version.versionId);
    }

    if (version.status === 'infected') {
      throw new DocumentScanFailedError(document.id, version.versionId);
    }

    const signed = await this.signer.createDownloadUrl(
      version.s3Key,
      request.expiresInSeconds ?? this.defaultDownloadExpirySeconds,
    );

    await this.writeAuditLog(document.id, version.versionId, request.userId, 'DOWNLOAD_REQUESTED', {
      versionNumber: version.versionNumber,
      unitId: normalizedUnit,
      role: request.role,
    });

    return {
      documentId: document.id,
      versionId: version.versionId,
      url: signed.url,
      expiresAt: signed.expiresAt,
    };
  }

  async grantPermission(
    actorId: string,
    request: GrantPermissionRequest,
  ): Promise<void> {
    const document = await this.repository.getDocumentById(request.documentId);
    if (!document) {
      throw new DocumentNotFoundError(request.documentId);
    }

    const permission: DocumentPermission = {
      documentId: document.id,
      role: request.role,
      unitId: normalizeUnitId(request.unitId),
      canRead: request.canRead,
      canWrite: request.canWrite,
      canDelete: request.canDelete,
      grantedBy: actorId,
      grantedAt: new Date(),
    };

    await this.repository.savePermission(permission);
    await this.writeAuditLog(document.id, document.latestVersionId, actorId, 'PERMISSION_UPDATED', {
      role: request.role,
      unitId: permission.unitId,
      canRead: request.canRead,
      canWrite: request.canWrite,
      canDelete: request.canDelete,
    });
  }

  async listAuditLogs(documentId: string): Promise<AuditLogEntry[]> {
    return this.repository.listAuditLogs(documentId);
  }

  private async ensurePermission(
    document: DocumentRecord,
    role: string,
    unitId: string | null,
    level: PermissionLevel,
    userId: string,
  ): Promise<void> {
    if (this.isAdminRole(role) || document.createdBy === userId) {
      return;
    }

    const hasPermission = await this.hasPermission(document.id, role, unitId, level);
    if (!hasPermission) {
      await this.writeAuditLog(document.id, document.latestVersionId, userId, 'ACCESS_DENIED', {
        level,
        role,
        unitId,
      });

      throw new DocumentAccessError(
        `Role ${role} for unit ${unitId ?? 'global'} lacks ${level} permission`,
      );
    }
  }

  private async hasPermission(
    documentId: string,
    role: string,
    unitId: string | null,
    level: PermissionLevel,
  ): Promise<boolean> {
    if (this.isAdminRole(role)) {
      return true;
    }

    const permissions = await this.repository.listPermissions(documentId);
    const field = `can${capitalize(level)}` as const;

    return permissions.some((permission) => {
      if (permission.role !== role) {
        return false;
      }

      if (!permission[field]) {
        return false;
      }

      return permission.unitId === null || permission.unitId === unitId;
    });
  }

  private isAdminRole(role: string): boolean {
    const normalized = role.toLowerCase();
    return normalized === 'admin' || normalized === 'superadmin' || normalized === 'owner';
  }

  private async writeAuditLog(
    documentId: string,
    versionId: string | undefined,
    actorId: string,
    action: AuditAction,
    details?: Record<string, unknown>,
  ) {
    await this.repository.addAuditLog({
      id: randomUUID(),
      documentId,
      versionId,
      actorId,
      action,
      timestamp: new Date(),
      details,
    });
  }
}
