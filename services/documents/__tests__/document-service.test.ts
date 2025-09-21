import { describe, expect, it, beforeEach } from 'vitest';

import {
  DocumentAccessError,
  DocumentService,
  InMemoryDocumentRepository,
} from '../index';
import type { AntivirusScanResult, AntivirusScanner } from '../antivirus';
import type { ObjectSigner, SignedUrl } from '../s3';

class FakeSigner implements ObjectSigner {
  async createUploadUrl(key: string, _contentType: string, expiresInSeconds?: number): Promise<SignedUrl> {
    const expiresIn = expiresInSeconds ?? 900;
    return {
      url: `https://s3-upload.local/${encodeURIComponent(key)}`,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
    };
  }

  async createDownloadUrl(key: string, expiresInSeconds?: number): Promise<SignedUrl> {
    const expiresIn = expiresInSeconds ?? 900;
    return {
      url: `https://s3-download.local/${encodeURIComponent(key)}`,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
    };
  }
}

class StubScanner implements AntivirusScanner {
  private result: AntivirusScanResult = { status: 'clean' };

  triggerLog: Array<{ bucket: string; key: string }> = [];

  setResult(result: AntivirusScanResult) {
    this.result = result;
  }

  async triggerScan(
    bucket: string,
    key: string,
    _context?: Record<string, unknown>,
  ): Promise<AntivirusScanResult> {
    this.triggerLog.push({ bucket, key });
    return this.result;
  }
}

describe('DocumentService', () => {
  const bucket = 'test-bucket';
  let repository: InMemoryDocumentRepository;
  let signer: FakeSigner;
  let scanner: StubScanner;
  let service: DocumentService;

  beforeEach(() => {
    repository = new InMemoryDocumentRepository();
    signer = new FakeSigner();
    scanner = new StubScanner();
    service = new DocumentService({
      repository,
      signer,
      scanner,
      bucket,
    });
  });

  it('creates a document version with signed upload and download URLs for authorized user', async () => {
    const upload = await service.requestUpload({
      userId: 'user-1',
      role: 'manager',
      unitId: 'unit-101',
      fileName: 'lease.pdf',
      contentType: 'application/pdf',
      contentLength: 1234,
      category: 'leases',
    });

    expect(upload.uploadUrl).toContain('lease.pdf');

    await service.completeUpload({
      documentId: upload.documentId,
      versionId: upload.versionId,
      actorId: 'system',
    });

    const download = await service.requestDownload({
      documentId: upload.documentId,
      userId: 'user-1',
      role: 'manager',
      unitId: 'unit-101',
    });

    expect(download.url).toContain('lease.pdf');
    expect(scanner.triggerLog).toHaveLength(1);
  });

  it('denies downloads for roles without permission and records audit events', async () => {
    const upload = await service.requestUpload({
      userId: 'user-1',
      role: 'manager',
      unitId: 'unit-101',
      fileName: 'notice.pdf',
      contentType: 'application/pdf',
      contentLength: 1024,
      category: 'notices',
    });

    await service.completeUpload({
      documentId: upload.documentId,
      versionId: upload.versionId,
      actorId: 'system',
    });

    await expect(
      service.requestDownload({
        documentId: upload.documentId,
        userId: 'user-2',
        role: 'resident',
        unitId: 'unit-101',
      }),
    ).rejects.toBeInstanceOf(DocumentAccessError);

    const auditLog = await service.listAuditLogs(upload.documentId);
    const denialEntry = auditLog.find((entry) => entry.action === 'ACCESS_DENIED');
    expect(denialEntry).toBeDefined();
    expect(denialEntry?.details).toMatchObject({ role: 'resident', unitId: 'unit-101' });
  });

  it('grants unit-scoped permissions and enforces version history', async () => {
    const upload = await service.requestUpload({
      userId: 'user-1',
      role: 'manager',
      unitId: 'unit-202',
      fileName: 'rules.pdf',
      contentType: 'application/pdf',
      contentLength: 2048,
      category: 'rules',
    });

    await service.completeUpload({
      documentId: upload.documentId,
      versionId: upload.versionId,
      actorId: 'system',
    });

    await service.grantPermission('user-1', {
      documentId: upload.documentId,
      role: 'resident',
      unitId: 'unit-202',
      canRead: true,
      canWrite: false,
      canDelete: false,
    });

    const residentDownload = await service.requestDownload({
      documentId: upload.documentId,
      userId: 'user-3',
      role: 'resident',
      unitId: 'unit-202',
    });
    expect(residentDownload.url).toContain('rules.pdf');

    await expect(
      service.requestDownload({
        documentId: upload.documentId,
        userId: 'user-4',
        role: 'resident',
        unitId: 'unit-999',
      }),
    ).rejects.toBeInstanceOf(DocumentAccessError);

    const secondUpload = await service.requestUpload({
      documentId: upload.documentId,
      userId: 'user-1',
      role: 'manager',
      unitId: 'unit-202',
      fileName: 'rules-v2.pdf',
      contentType: 'application/pdf',
      contentLength: 3072,
    });

    await service.completeUpload({
      documentId: secondUpload.documentId,
      versionId: secondUpload.versionId,
      actorId: 'system',
    });

    const versions = await repository.listDocumentVersions(upload.documentId);
    expect(versions).toHaveLength(2);
    expect(versions[0].versionNumber).toBe(1);
    expect(versions[1].versionNumber).toBe(2);
    expect(versions[1].status).toBe('clean');
  });
});
