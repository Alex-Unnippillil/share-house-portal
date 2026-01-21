export type MaintenancePriority = 'low' | 'normal' | 'high' | 'urgent'

export type MaintenanceStatus =
  | 'pending'
  | 'triaged'
  | 'scheduled'
  | 'awaiting_vendor'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export type MaintenanceTriageState =
  | 'untriaged'
  | 'in_review'
  | 'escalated'
  | 'resolved'

export type MaintenanceStageKey =
  | 'reported'
  | 'triaged'
  | 'vendor'
  | 'in_progress'
  | 'completed'

export interface MaintenancePhotoAttachment {
  bucket: string
  path: string
  name: string
  size: number
  mime_type: string
  uploaded_at: string
  public_url?: string | null
  thumbnails?: Array<{ size: string; url: string }>
}

export interface MaintenanceStatusProof {
  actor_id: string
  actor_role: 'tenant' | 'roommate' | 'property_manager' | 'vendor'
  captured_at: string
  notes?: string
  attachments?: MaintenancePhotoAttachment[]
}

export interface MaintenanceStatusEvent {
  request_id: string
  previous_status: MaintenanceStatus | null
  next_status: MaintenanceStatus
  changed_at: string
  changed_by: string
  proof: MaintenanceStatusProof
  metadata?: Record<string, unknown>
}

export const MAINTENANCE_STATUS_ORDER: MaintenanceStatus[] = [
  'pending',
  'triaged',
  'awaiting_vendor',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
]

export const MAINTENANCE_STAGE_SEQUENCE: MaintenanceStageKey[] = [
  'reported',
  'triaged',
  'vendor',
  'in_progress',
  'completed',
]
