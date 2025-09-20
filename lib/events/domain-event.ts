export interface DomainEvent<TPayload = Record<string, unknown>> {
  type: string;
  timestamp: string;
  payload: TPayload;
  /**
   * Optional correlation identifier to tie the event back to the originating request.
   */
  correlationId?: string;
}

export interface DomainEventPublisher {
  publish(event: DomainEvent): Promise<void>;
}

/**
 * Publisher implementation that silently ignores events. Useful for tests or
 * environments where infrastructure is not yet configured.
 */
export class NoopDomainEventPublisher implements DomainEventPublisher {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async publish(_event: DomainEvent): Promise<void> {
    return Promise.resolve();
  }
}
