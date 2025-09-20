import { NextResponse } from 'next/server';

import { InvalidStateTransitionError, MaintenanceRequestNotFoundError } from './errors';
import { maintenanceService } from './service-instance';
import type { ServiceRequestPriority, ServiceRequestState } from './types';

const VALID_STATES: ServiceRequestState[] = ['new', 'in_progress', 'blocked', 'completed', 'cancelled'];
const VALID_PRIORITIES: ServiceRequestPriority[] = ['low', 'medium', 'high'];

type RouteContext = { params: { requestId: string } };

function badRequest(message: string): Response {
  return NextResponse.json({ error: message }, { status: 400 });
}

function handleError(error: unknown): Response {
  if (error instanceof MaintenanceRequestNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  if (error instanceof InvalidStateTransitionError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  const message = error instanceof Error ? error.message : 'Unexpected error occurred.';
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function createServiceRequestEndpoint(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    return badRequest('Invalid JSON payload.');
  }

  if (!body || typeof body !== 'object') {
    return badRequest('Request body is required.');
  }

  const { title, description, requestedBy, priority } = body as Record<string, unknown>;

  if (typeof title !== 'string' || !title.trim()) {
    return badRequest('A title is required to create a service request.');
  }

  if (typeof description !== 'string' || !description.trim()) {
    return badRequest('A description is required to create a service request.');
  }

  if (typeof requestedBy !== 'string' || !requestedBy.trim()) {
    return badRequest('A requester identifier is required to create a service request.');
  }

  try {
    const requestRecord = await maintenanceService.createRequest({
      title: title.trim(),
      description: description.trim(),
      requestedBy: requestedBy.trim(),
      priority:
        typeof priority === 'string' && VALID_PRIORITIES.includes(priority as ServiceRequestPriority)
          ? (priority as ServiceRequestPriority)
          : undefined,
    });

    return NextResponse.json(requestRecord, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

export async function addServiceRequestCommentEndpoint(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { requestId } = context.params;
  if (!requestId) {
    return badRequest('A request id is required.');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    return badRequest('Invalid JSON payload.');
  }

  if (!body || typeof body !== 'object') {
    return badRequest('Request body is required.');
  }

  const { authorId, body: commentBody } = body as Record<string, unknown>;

  if (typeof authorId !== 'string' || !authorId.trim()) {
    return badRequest('A comment author identifier is required.');
  }

  if (typeof commentBody !== 'string' || !commentBody.trim()) {
    return badRequest('Comment content is required.');
  }

  try {
    const comment = await maintenanceService.addComment(requestId, {
      authorId: authorId.trim(),
      body: commentBody.trim(),
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

export async function addServiceRequestAttachmentEndpoint(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { requestId } = context.params;
  if (!requestId) {
    return badRequest('A request id is required.');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    return badRequest('Invalid JSON payload.');
  }

  if (!body || typeof body !== 'object') {
    return badRequest('Request body is required.');
  }

  const { uploadedBy, fileName, fileUrl } = body as Record<string, unknown>;

  if (typeof uploadedBy !== 'string' || !uploadedBy.trim()) {
    return badRequest('An uploader identifier is required.');
  }

  if (typeof fileName !== 'string' || !fileName.trim()) {
    return badRequest('Attachment file name is required.');
  }

  if (typeof fileUrl !== 'string' || !fileUrl.trim()) {
    return badRequest('Attachment file URL is required.');
  }

  try {
    const attachment = await maintenanceService.addAttachment(requestId, {
      uploadedBy: uploadedBy.trim(),
      fileName: fileName.trim(),
      fileUrl: fileUrl.trim(),
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

export async function transitionServiceRequestStateEndpoint(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { requestId } = context.params;
  if (!requestId) {
    return badRequest('A request id is required.');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    return badRequest('Invalid JSON payload.');
  }

  if (!body || typeof body !== 'object') {
    return badRequest('Request body is required.');
  }

  const { newState, changedBy, reason } = body as Record<string, unknown>;

  if (typeof changedBy !== 'string' || !changedBy.trim()) {
    return badRequest('A user identifier is required to change state.');
  }

  if (typeof newState !== 'string' || !VALID_STATES.includes(newState as ServiceRequestState)) {
    return badRequest('A valid target state is required.');
  }

  try {
    const updatedRequest = await maintenanceService.transitionState(requestId, {
      newState: newState as ServiceRequestState,
      changedBy: changedBy.trim(),
      reason: typeof reason === 'string' ? reason.trim() || undefined : undefined,
    });

    return NextResponse.json(updatedRequest, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
