export type DomainEventName =
  | "visitor.booking.submitted"
  | "maintenance.request.submitted"
  | "rent.payment.recorded"
  | "document.signed"

export interface VisitorBookingSubmittedPayload {
  bookingId: string
  guest: {
    name: string
    email: string | null
    phone?: string | null
  }
  host: {
    id: string
    name: string
    email: string | null
  }
  stay: {
    checkInDate: string
    checkOutDate: string
  }
  purpose: string
  propertyManager: {
    id: string
    name: string
    email: string | null
  }
  roommates: Array<{
    id: string
    name: string
    email: string | null
  }>
}

export interface MaintenanceRequestSubmittedPayload {
  requestId: string
  unitId: string
  title: string
  description: string
  priority: "low" | "normal" | "high" | "urgent"
  category?: string | null
  location?: string | null
  requester: {
    id: string
    name: string
    email: string | null
  }
  propertyManager: {
    id: string
    name: string
    email: string | null
  }
}

export interface RentPaymentRecordedPayload {
  paymentId?: string | null
  tenant: {
    id: string
    name: string
    email: string | null
  }
  amount: {
    currency: string
    value: number
  }
  description: string
  paymentDate: string
}

export interface DocumentSignedPayload {
  documentId?: string | null
  documentTitle: string
  signer: {
    id: string
    name: string
    email: string | null
  }
  signedAt: string
}

export interface DomainEventPayloadMap {
  "visitor.booking.submitted": VisitorBookingSubmittedPayload
  "maintenance.request.submitted": MaintenanceRequestSubmittedPayload
  "rent.payment.recorded": RentPaymentRecordedPayload
  "document.signed": DocumentSignedPayload
}

export interface DomainEventEnvelope<
  Name extends DomainEventName = DomainEventName
> {
  event: Name
  version: string
  occurredAt: string
  payload: DomainEventPayloadMap[Name]
}
