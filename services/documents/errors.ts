export class DocumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DocumentError';
  }
}

export class DocumentNotFoundError extends DocumentError {
  constructor(documentId: string) {
    super(`Document ${documentId} was not found`);
    this.name = 'DocumentNotFoundError';
  }
}

export class DocumentVersionNotFoundError extends DocumentError {
  constructor(documentId: string, versionId: string) {
    super(`Version ${versionId} for document ${documentId} was not found`);
    this.name = 'DocumentVersionNotFoundError';
  }
}

export class DocumentAccessError extends DocumentError {
  constructor(message: string) {
    super(message);
    this.name = 'DocumentAccessError';
  }
}

export class DocumentScanPendingError extends DocumentError {
  constructor(documentId: string, versionId: string) {
    super(`Document ${documentId} version ${versionId} is still being scanned`);
    this.name = 'DocumentScanPendingError';
  }
}

export class DocumentScanFailedError extends DocumentError {
  constructor(documentId: string, versionId: string) {
    super(`Document ${documentId} version ${versionId} failed antivirus scanning`);
    this.name = 'DocumentScanFailedError';
  }
}
