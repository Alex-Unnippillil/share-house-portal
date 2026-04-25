import { incrementOperationalMetric } from "@/lib/observability/metrics"
import {
  providerOutageMessage,
  resilientRequest,
  UpstreamHttpError,
} from "@/lib/resilience"
import { DocumentSigningRequest, DocumentSigningResponse } from "@/types/documents"

const DOCUMENSO_BASE_URL = process.env.DOCUMENSO_BASE_URL || "https://app.documenso.com"
const DOCUMENSO_API_KEY = process.env.DOCUMENSO_API_KEY

if (!DOCUMENSO_API_KEY) {
  console.warn("DOCUMENSO_API_KEY is not configured")
}

const getAuthHeaders = (): Record<string, string> => ({
  Authorization: `Bearer ${DOCUMENSO_API_KEY}`,
  "Content-Type": "application/json",
})

export interface DocumensoDocument {
  id: string
  title: string
  status: string
  createdAt: string
  updatedAt: string
  recipients: DocumensoRecipient[]
  documentDataId: string
}

export interface DocumensoRecipient {
  id: string
  email: string
  name?: string
  role: string
  signingOrder?: number
  token: string
  signedAt?: string
  status: string
}

export interface DocumensoCreateDocumentRequest {
  title: string
  documentDataId: string
  recipients: {
    email: string
    name?: string
    role: "SIGNER" | "APPROVER" | "CC"
    signingOrder?: number
  }[]
  message?: string
  expiresAt?: string
}

export interface DocumensoCreateDocumentResponse {
  id: string
  title: string
  status: string
  recipients: DocumensoRecipient[]
}

export interface DocumensoUploadResponse {
  id: string
  documentDataId: string
}

class DocumensoService {
  private baseUrl: string
  private apiKey: string

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
  }

  private async request(path: string, init: RequestInit, operation: string): Promise<Response> {
    const { value: response } = await resilientRequest(
      async () => {
        const response = await fetch(`${this.baseUrl}${path}`, {
          ...init,
          headers: {
            ...getAuthHeaders(),
            ...(init.headers ?? {}),
          },
        })

        if (!response.ok) {
          const errorText = await response.text().catch(() => response.statusText)
          throw new UpstreamHttpError("documenso", operation, response.status, errorText)
        }

        return response
      },
      {
        provider: "documenso",
        operation,
        retries: 2,
        initialDelayMs: 300,
        jitter: true,
        timeoutMs: 8_000,
        shouldRetry: (error) => {
          if (error instanceof UpstreamHttpError) {
            return error.status === 429 || error.status >= 500
          }
          return true
        },
        onCircuitOpen: () => {
          incrementOperationalMetric("upstream_circuit_open_total", {
            source: "documenso_service",
            provider: "documenso",
            operation,
          })
        },
      }
    )

    return response
  }

  async uploadDocument(file: File): Promise<DocumensoUploadResponse> {
    const formData = new FormData()
    formData.append("file", file)

    const response = await this.request(
      "/api/v1/documents/upload",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
      },
      "upload_document"
    )

    return response.json()
  }

  async createDocumentSigningEnvelope(
    request: DocumensoCreateDocumentRequest
  ): Promise<DocumensoCreateDocumentResponse> {
    const response = await this.request(
      "/api/v1/documents",
      {
        method: "POST",
        body: JSON.stringify(request),
      },
      "create_document_signing_envelope"
    )

    return response.json()
  }

  async getDocument(documentId: string): Promise<DocumensoDocument> {
    const response = await this.request(
      `/api/v1/documents/${documentId}`,
      { method: "GET" },
      "get_document"
    )

    return response.json()
  }

  async getSigningUrl(documentId: string, recipientId: string): Promise<string> {
    const response = await this.request(
      `/api/v1/documents/${documentId}/recipients/${recipientId}/signing-url`,
      { method: "GET" },
      "get_signing_url"
    )

    const data = await response.json()
    return data.signingUrl
  }

  async sendSigningReminder(documentId: string, recipientId: string): Promise<void> {
    await this.request(
      `/api/v1/documents/${documentId}/recipients/${recipientId}/remind`,
      { method: "POST" },
      "send_signing_reminder"
    )
  }

  async cancelDocument(documentId: string): Promise<void> {
    await this.request(
      `/api/v1/documents/${documentId}/cancel`,
      { method: "POST" },
      "cancel_document"
    )
  }

  async createFromTemplate(
    templateId: string,
    title: string,
    recipients: DocumensoCreateDocumentRequest["recipients"]
  ): Promise<DocumensoCreateDocumentResponse> {
    const response = await this.request(
      `/api/v1/templates/${templateId}/use`,
      {
        method: "POST",
        body: JSON.stringify({ title, recipients }),
      },
      "create_from_template"
    )

    return response.json()
  }
}

export const documensoService = new DocumensoService(
  DOCUMENSO_BASE_URL,
  DOCUMENSO_API_KEY || ""
)

export async function createLeaseSigningRequest(
  request: DocumentSigningRequest & {
    file: File
    tenantEmails: string[]
    tenantNames?: string[]
    propertyManagerEmail?: string
    propertyManagerName?: string
  }
): Promise<DocumentSigningResponse> {
  try {
    const uploadResponse = await documensoService.uploadDocument(request.file)

    const recipients: DocumensoCreateDocumentRequest["recipients"] = request.tenantEmails.map((email, index) => ({
      email,
      name: request.tenantNames?.[index] || email.split("@")[0],
      role: "SIGNER" as const,
      signingOrder: index + 1,
    }))

    const trimmedPropertyManagerEmail = request.propertyManagerEmail?.trim()

    if (
      trimmedPropertyManagerEmail &&
      !request.tenantEmails.some(
        (email) => email.trim().toLowerCase() === trimmedPropertyManagerEmail.toLowerCase()
      )
    ) {
      recipients.push({
        email: trimmedPropertyManagerEmail,
        name: request.propertyManagerName?.trim() || "Property Manager",
        role: "CC",
      })
    }

    const docResponse = await documensoService.createDocumentSigningEnvelope({
      title: request.document_id,
      documentDataId: uploadResponse.documentDataId,
      recipients,
      message: request.message,
      expiresAt: request.expires_in_days
        ? new Date(Date.now() + request.expires_in_days * 24 * 60 * 60 * 1000).toISOString()
        : undefined,
    })

    const signingUrl = await documensoService.getSigningUrl(
      docResponse.id,
      docResponse.recipients[0].id
    )

    return {
      success: true,
      envelope_id: docResponse.id,
      signing_url: signingUrl,
    }
  } catch (error) {
    console.error("Error creating lease signing request:", error)
    return {
      success: false,
      error: providerOutageMessage("documenso"),
    }
  }
}
