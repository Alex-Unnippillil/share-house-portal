export type ServiceRequestState = 'new' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';

export type ServiceRequestPriority = 'low' | 'medium' | 'high';

export interface ServiceRequest {
  id: string;
  title: string;
  description: string;
  requestedBy: string;
  priority: ServiceRequestPriority;
  state: ServiceRequestState;
  createdAt: string;
  updatedAt: string;
  comments: ServiceRequestComment[];
  attachments: ServiceRequestAttachment[];
  history: ServiceRequestStateChange[];
}

export interface ServiceRequestComment {
  id: string;
  requestId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface ServiceRequestAttachment {
  id: string;
  requestId: string;
  uploadedBy: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
}

export interface ServiceRequestStateChange {
  fromState: ServiceRequestState;
  toState: ServiceRequestState;
  changedAt: string;
  changedBy: string;
  reason?: string;
}

export interface CreateServiceRequestInput {
  title: string;
  description: string;
  requestedBy: string;
  priority?: ServiceRequestPriority;
}

export interface AddCommentInput {
  authorId: string;
  body: string;
}

export interface AddAttachmentInput {
  uploadedBy: string;
  fileName: string;
  fileUrl: string;
}

export interface TransitionStateInput {
  newState: ServiceRequestState;
  changedBy: string;
  reason?: string;
}
