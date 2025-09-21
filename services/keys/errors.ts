import type { PolicyValidationResult, PolicyViolation } from './types';

export type KeyServiceErrorCode =
  | 'VALIDATION_ERROR'
  | 'POLICY_VIOLATION'
  | 'REPOSITORY_ERROR'
  | 'NOTIFICATION_ERROR'
  | 'CONNECTOR_ERROR'
  | 'CONFIGURATION_ERROR';

export interface KeyServiceErrorOptions {
  cause?: unknown;
  details?: Record<string, unknown>;
}

export class KeyServiceError extends Error {
  readonly code: KeyServiceErrorCode;

  readonly details?: Record<string, unknown>;

  override readonly cause?: unknown;

  constructor(code: KeyServiceErrorCode, message: string, options: KeyServiceErrorOptions = {}) {
    super(message);
    this.name = 'KeyServiceError';
    this.code = code;
    this.details = options.details;
    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }

  static from(
    cause: unknown,
    code: KeyServiceErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ): KeyServiceError {
    if (cause instanceof KeyServiceError) {
      return cause;
    }

    let enrichedDetails: Record<string, unknown> | undefined = details
      ? { ...details }
      : undefined;
    if (cause instanceof Error) {
      if (enrichedDetails) {
        enrichedDetails.causeMessage = cause.message;
      } else {
        enrichedDetails = { causeMessage: cause.message };
      }
    }

    return new KeyServiceError(code, message, { cause, details: enrichedDetails });
  }
}

export class PolicyViolationError extends KeyServiceError {
  readonly violations: PolicyViolation[];

  readonly validation?: PolicyValidationResult;

  constructor(
    violations: PolicyViolation[],
    validation?: PolicyValidationResult,
    message = 'Key policy validation failed',
  ) {
    super('POLICY_VIOLATION', message, {
      details: {
        violations,
        evaluatedPolicies: validation?.evaluatedPolicies,
      },
    });
    this.name = 'PolicyViolationError';
    this.violations = violations;
    this.validation = validation;
  }
}

export const isKeyServiceError = (error: unknown): error is KeyServiceError =>
  error instanceof KeyServiceError;
