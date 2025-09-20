import { randomUUID } from 'crypto';

import type { DomainEventPublisher } from '@/lib/events/domain-event';

import { InvalidStateTransitionError, MaintenanceRequestNotFoundError } from './errors';
import type {
  AddAttachmentInput,
  AddCommentInput,
  CreateServiceRequestInput,
  ServiceRequest,
  ServiceRequestAttachment,
  ServiceRequestComment,
  ServiceRequestState,
  ServiceRequestStateChange,
  TransitionStateInput,
} from './types';
import type { MaintenanceRepository } from './repository';

const ALLOWED_TRANSITIONS: Record<ServiceRequestState, ServiceRequestState[]> = {
  new: ['in_progress', 'cancelled'],
  in_progress: ['blocked', 'completed', 'cancelled'],
  blocked: ['in_progress', 'cancelled'],
  completed: [],
  cancelled: [],
};

export class MaintenanceService {
  constructor(
    private readonly repository: MaintenanceRepository,
    private readonly publisher: DomainEventPublisher,
  ) {}

  async createRequest(input: CreateServiceRequestInput): Promise<ServiceRequest> {
    const timestamp = new Date().toISOString();
    const request: ServiceRequest = {
      id: randomUUID(),
      title: input.title,
      description: input.description,
      requestedBy: input.requestedBy,
      priority: input.priority ?? 'medium',
      state: 'new',
      createdAt: timestamp,
      updatedAt: timestamp,
      comments: [],
      attachments: [],
      history: [],
    };

    return this.repository.create(request);
  }

  async addComment(requestId: string, input: AddCommentInput): Promise<ServiceRequestComment> {
    const request = await this.requireRequest(requestId);
    const now = new Date().toISOString();
    const comment: ServiceRequestComment = {
      id: randomUUID(),
      requestId,
      authorId: input.authorId,
      body: input.body,
      createdAt: now,
    };

    request.comments.push(comment);
    request.updatedAt = now;
    await this.repository.save(request);

    return comment;
  }

  async addAttachment(requestId: string, input: AddAttachmentInput): Promise<ServiceRequestAttachment> {
    const request = await this.requireRequest(requestId);
    const now = new Date().toISOString();
    const attachment: ServiceRequestAttachment = {
      id: randomUUID(),
      requestId,
      uploadedBy: input.uploadedBy,
      fileName: input.fileName,
      fileUrl: input.fileUrl,
      uploadedAt: now,
    };

    request.attachments.push(attachment);
    request.updatedAt = now;
    await this.repository.save(request);

    return attachment;
  }

  async transitionState(requestId: string, input: TransitionStateInput): Promise<ServiceRequest> {
    const request = await this.requireRequest(requestId);
    if (request.state === input.newState) {
      return request;
    }

    const allowedStates = ALLOWED_TRANSITIONS[request.state] ?? [];
    if (!allowedStates.includes(input.newState)) {
      throw new InvalidStateTransitionError(request.state, input.newState);
    }

    const now = new Date().toISOString();
    const historyEntry: ServiceRequestStateChange = {
      fromState: request.state,
      toState: input.newState,
      changedAt: now,
      changedBy: input.changedBy,
      reason: input.reason,
    };

    request.state = input.newState;
    request.updatedAt = now;
    request.history.push(historyEntry);
    const updated = await this.repository.save(request);

    await this.publisher.publish({
      type: 'maintenance.request.stateChanged',
      timestamp: now,
      payload: {
        requestId: updated.id,
        fromState: historyEntry.fromState,
        toState: historyEntry.toState,
        changedBy: historyEntry.changedBy,
        reason: historyEntry.reason,
      },
    });

    return updated;
  }

  private async requireRequest(requestId: string): Promise<ServiceRequest> {
    const request = await this.repository.getById(requestId);
    if (!request) {
      throw new MaintenanceRequestNotFoundError(requestId);
    }
    return request;
  }
}
