import { DocumentNotFoundError, DocumentVersionNotFoundError } from './errors';
import type {
  AuditLogEntry,
  DocumentPermission,
  DocumentRecord,
  DocumentVersion,
} from './types';

export interface DocumentRepository {
  createDocument(document: DocumentRecord): Promise<void>;
  updateDocument(document: DocumentRecord): Promise<void>;
  getDocumentById(documentId: string): Promise<DocumentRecord | null>;
  addVersion(version: DocumentVersion): Promise<void>;
  updateDocumentVersion(version: DocumentVersion): Promise<void>;
  getVersionById(documentId: string, versionId: string): Promise<DocumentVersion | null>;
  listDocumentVersions(documentId: string): Promise<DocumentVersion[]>;
  savePermission(permission: DocumentPermission): Promise<void>;
  listPermissions(documentId: string): Promise<DocumentPermission[]>;
  addAuditLog(entry: AuditLogEntry): Promise<void>;
  listAuditLogs(documentId: string): Promise<AuditLogEntry[]>;
}

const cloneDocument = (document: DocumentRecord): DocumentRecord => ({
  ...document,
  createdAt: new Date(document.createdAt),
  updatedAt: new Date(document.updatedAt),
});

const cloneVersion = (version: DocumentVersion): DocumentVersion => ({
  ...version,
  createdAt: new Date(version.createdAt),
  scannedAt: version.scannedAt ? new Date(version.scannedAt) : version.scannedAt,
});

const cloneAuditLog = (entry: AuditLogEntry): AuditLogEntry => ({
  ...entry,
  timestamp: new Date(entry.timestamp),
});

export class InMemoryDocumentRepository implements DocumentRepository {
  private readonly documents = new Map<string, DocumentRecord>();

  private readonly versions = new Map<string, Map<string, DocumentVersion>>();

  private readonly auditLogs = new Map<string, AuditLogEntry[]>();

  private readonly permissions = new Map<string, DocumentPermission[]>();

  async createDocument(document: DocumentRecord): Promise<void> {
    if (this.documents.has(document.id)) {
      throw new Error(`Document ${document.id} already exists`);
    }

    this.documents.set(document.id, cloneDocument(document));
    this.permissions.set(document.id, []);
    this.versions.set(document.id, new Map());
    this.auditLogs.set(document.id, []);
  }

  async updateDocument(document: DocumentRecord): Promise<void> {
    if (!this.documents.has(document.id)) {
      throw new DocumentNotFoundError(document.id);
    }

    this.documents.set(document.id, cloneDocument(document));
  }

  async getDocumentById(documentId: string): Promise<DocumentRecord | null> {
    const document = this.documents.get(documentId);
    if (!document) {
      return null;
    }

    return cloneDocument(document);
  }

  async addVersion(version: DocumentVersion): Promise<void> {
    const documentVersions = this.versions.get(version.documentId);
    if (!documentVersions) {
      throw new DocumentNotFoundError(version.documentId);
    }

    documentVersions.set(version.versionId, cloneVersion(version));
  }

  async updateDocumentVersion(version: DocumentVersion): Promise<void> {
    const documentVersions = this.versions.get(version.documentId);
    if (!documentVersions || !documentVersions.has(version.versionId)) {
      throw new DocumentVersionNotFoundError(version.documentId, version.versionId);
    }

    documentVersions.set(version.versionId, cloneVersion(version));
  }

  async getVersionById(documentId: string, versionId: string): Promise<DocumentVersion | null> {
    const documentVersions = this.versions.get(documentId);
    if (!documentVersions) {
      return null;
    }

    const version = documentVersions.get(versionId);
    return version ? cloneVersion(version) : null;
  }

  async listDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
    const documentVersions = this.versions.get(documentId);
    if (!documentVersions) {
      return [];
    }

    return Array.from(documentVersions.values())
      .map(cloneVersion)
      .sort((a, b) => a.versionNumber - b.versionNumber);
  }

  async savePermission(permission: DocumentPermission): Promise<void> {
    const existing = this.permissions.get(permission.documentId);
    if (!existing) {
      throw new DocumentNotFoundError(permission.documentId);
    }

    const index = existing.findIndex(
      (candidate) =>
        candidate.role === permission.role && candidate.unitId === permission.unitId,
    );

    if (index >= 0) {
      existing[index] = { ...permission };
    } else {
      existing.push({ ...permission });
    }
  }

  async listPermissions(documentId: string): Promise<DocumentPermission[]> {
    const existing = this.permissions.get(documentId);
    if (!existing) {
      throw new DocumentNotFoundError(documentId);
    }

    return existing.map((permission) => ({ ...permission }));
  }

  async addAuditLog(entry: AuditLogEntry): Promise<void> {
    const logs = this.auditLogs.get(entry.documentId);
    if (!logs) {
      throw new DocumentNotFoundError(entry.documentId);
    }

    logs.push(cloneAuditLog(entry));
  }

  async listAuditLogs(documentId: string): Promise<AuditLogEntry[]> {
    const logs = this.auditLogs.get(documentId);
    if (!logs) {
      throw new DocumentNotFoundError(documentId);
    }

    return logs.map(cloneAuditLog);
  }
}
