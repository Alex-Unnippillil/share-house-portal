import { DocumentSigningRequest, DocumentSigningResponse } from '@/types/documents';

const DOCUMENSO_BASE_URL = process.env.DOCUMENSO_BASE_URL || 'https://app.documenso.com';
const DOCUMENSO_API_KEY = process.env.DOCUMENSO_API_KEY;

if (!DOCUMENSO_API_KEY) {
  console.warn('DOCUMENSO_API_KEY is not configured');
}

const getAuthHeaders = (): Record<string, string> => ({
  Authorization: `Bearer ${DOCUMENSO_API_KEY}`,
  'Content-Type': 'application/json',
});

export interface DocumensoDocument {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  recipients: DocumensoRecipient[];
  documentDataId: string;
}

export interface DocumensoRecipient {
  id: string;
  email: string;
  name?: string;
  role: string;
  signingOrder?: number;
  token: string;
  signedAt?: string;
  status: string;
}

export interface DocumensoCreateDocumentRequest {
  title: string;
  documentDataId: string; // ID of uploaded document data
  recipients: {
    email: string;
    name?: string;
    role: 'SIGNER' | 'APPROVER' | 'CC';
    signingOrder?: number;
  }[];
  message?: string;
  expiresAt?: string;
}

export interface DocumensoCreateDocumentResponse {
  id: string;
  title: string;
  status: string;
  recipients: DocumensoRecipient[];
}

export interface DocumensoUploadResponse {
  id: string;
  documentDataId: string;
}

class DocumensoService {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * Upload a document to Documenso
   */
  async uploadDocument(file: File): Promise<DocumensoUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/api/v1/documents/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Documenso upload failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Create a signing envelope for a document
   */
  async createDocumentSigningEnvelope(
    request: DocumensoCreateDocumentRequest
  ): Promise<DocumensoCreateDocumentResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/documents`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Documenso create document failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Get document details
   */
  async getDocument(documentId: string): Promise<DocumensoDocument> {
    const response = await fetch(`${this.baseUrl}/api/v1/documents/${documentId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Documenso get document failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Get signing URL for a recipient
   */
  async getSigningUrl(documentId: string, recipientId: string): Promise<string> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/documents/${documentId}/recipients/${recipientId}/signing-url`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Documenso get signing URL failed: ${error}`);
    }

    const data = await response.json();
    return data.signingUrl;
  }

  /**
   * Send signing reminder
   */
  async sendSigningReminder(documentId: string, recipientId: string): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/documents/${documentId}/recipients/${recipientId}/remind`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Documenso send reminder failed: ${error}`);
    }
  }

  /**
   * Cancel a document
   */
  async cancelDocument(documentId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/v1/documents/${documentId}/cancel`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Documenso cancel document failed: ${error}`);
    }
  }

  /**
   * Redact recipient data from a document envelope
   */
  async redactDocumentRecipients(
    documentId: string,
    payload: { recipientTokens?: string[] } = {}
  ): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/documents/${documentId}/redact`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Documenso redact document failed: ${error}`);
    }
  }

  /**
   * Permanently delete a document from Documenso
   */
  async deleteDocument(documentId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/v1/documents/${documentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Documenso delete document failed: ${error}`);
    }
  }

  /**
   * Create document from template
   */
  async createFromTemplate(
    templateId: string,
    title: string,
    recipients: DocumensoCreateDocumentRequest['recipients']
  ): Promise<DocumensoCreateDocumentResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/templates/${templateId}/use`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        title,
        recipients,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Documenso create from template failed: ${error}`);
    }

    return response.json();
  }
}

// Export singleton instance
export const documensoService = new DocumensoService(
  DOCUMENSO_BASE_URL,
  DOCUMENSO_API_KEY || ''
);

/**
 * Helper function to create a lease signing request
 */
export async function createLeaseSigningRequest(
  request: DocumentSigningRequest & {
    file: File;
    tenantEmails: string[];
    tenantNames?: string[];
  }
): Promise<DocumentSigningResponse> {
  try {
    // Upload the document first
    const uploadResponse = await documensoService.uploadDocument(request.file);

    // Create recipients from tenant emails
    const recipients = request.tenantEmails.map((email, index) => ({
      email,
      name: request.tenantNames?.[index] || email.split('@')[0],
      role: 'SIGNER' as const,
      signingOrder: index + 1,
    }));

    // Add property manager as CC if needed
    // TODO: Add property manager email from profile

    // Create the document envelope
    const docResponse = await documensoService.createDocumentSigningEnvelope({
      title: request.document_id, // Using document_id as title for now
      documentDataId: uploadResponse.documentDataId,
      recipients,
      message: request.message,
      expiresAt: request.expires_in_days
        ? new Date(Date.now() + request.expires_in_days * 24 * 60 * 60 * 1000).toISOString()
        : undefined,
    });

    // Get signing URL for the first recipient
    const signingUrl = await documensoService.getSigningUrl(
      docResponse.id,
      docResponse.recipients[0].id
    );

    return {
      success: true,
      envelope_id: docResponse.id,
      signing_url: signingUrl,
    };
  } catch (error) {
    console.error('Error creating lease signing request:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
