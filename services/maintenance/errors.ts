export class MaintenanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MaintenanceError';
  }
}

export class MaintenanceRequestNotFoundError extends MaintenanceError {
  constructor(requestId: string) {
    super(`Service request ${requestId} was not found.`);
    this.name = 'MaintenanceRequestNotFoundError';
  }
}

export class InvalidStateTransitionError extends MaintenanceError {
  constructor(currentState: string, nextState: string) {
    super(`Cannot transition maintenance request from ${currentState} to ${nextState}.`);
    this.name = 'InvalidStateTransitionError';
  }
}
