import { KeyServiceError, PolicyViolationError } from './errors';
import { KeyPolicyValidator } from './policies';
import type {
  KeyCabinetConnector,
  KeyCheckoutRecord,
  KeyCheckoutRequest,
  KeyNotificationService,
  KeyRepository,
  KeyReturnRequest,
  OverdueAlertPayload,
  PolicyValidationResult,
} from './types';

export interface KeyServiceDependencies {
  repository: KeyRepository;
  notificationService: KeyNotificationService;
  policyValidator?: KeyPolicyValidator;
  cabinetConnector?: KeyCabinetConnector;
}

export interface OverdueAlertFailure {
  record: KeyCheckoutRecord;
  error: KeyServiceError;
}

export interface OverdueAlertSummary {
  referenceDate: Date;
  totalOverdue: number;
  alertsSent: number;
  failures: OverdueAlertFailure[];
}

export class KeyService {
  private readonly policyValidator: KeyPolicyValidator;

  private readonly repository: KeyRepository;

  private readonly notificationService: KeyNotificationService;

  private readonly cabinetConnector?: KeyCabinetConnector;

  constructor(dependencies: KeyServiceDependencies) {
    this.repository = dependencies.repository;
    this.notificationService = dependencies.notificationService;
    this.policyValidator = dependencies.policyValidator ?? new KeyPolicyValidator();
    this.cabinetConnector = dependencies.cabinetConnector;
  }

  async checkoutKey(request: KeyCheckoutRequest): Promise<KeyCheckoutRecord> {
    let validation: PolicyValidationResult | undefined;
    try {
      validation = await this.policyValidator.validate(request);
      if (!validation.passed) {
        throw new PolicyViolationError(validation.violations, validation);
      }
    } catch (error) {
      if (error instanceof PolicyViolationError) {
        throw error;
      }
      throw KeyServiceError.from(error, 'VALIDATION_ERROR', 'Failed to validate checkout request', {
        keyId: request.keyId,
        userId: request.userId,
      });
    }

    let record: KeyCheckoutRecord;
    try {
      record = await this.repository.checkout(request);
    } catch (error) {
      throw KeyServiceError.from(error, 'REPOSITORY_ERROR', 'Unable to checkout key', {
        keyId: request.keyId,
        userId: request.userId,
      });
    }

    if (this.cabinetConnector) {
      try {
        await this.cabinetConnector.dispatchCheckout(record);
      } catch (error) {
        throw KeyServiceError.from(error, 'CONNECTOR_ERROR', 'Failed to notify key cabinet of checkout', {
          keyId: record.keyId,
          transactionId: record.id,
        });
      }
    }

    return record;
  }

  async returnKey(request: KeyReturnRequest): Promise<KeyCheckoutRecord> {
    let record: KeyCheckoutRecord;
    try {
      record = await this.repository.return(request);
    } catch (error) {
      throw KeyServiceError.from(error, 'REPOSITORY_ERROR', 'Unable to return key', {
        keyId: request.keyId,
        userId: request.userId,
        transactionId: request.transactionId,
      });
    }

    if (this.cabinetConnector) {
      try {
        await this.cabinetConnector.dispatchReturn(record);
      } catch (error) {
        throw KeyServiceError.from(error, 'CONNECTOR_ERROR', 'Failed to notify key cabinet of return', {
          keyId: record.keyId,
          transactionId: record.id,
        });
      }
    }

    return record;
  }

  async triggerOverdueAlerts(referenceDate = new Date()): Promise<OverdueAlertSummary> {
    let overdueRecords: KeyCheckoutRecord[];
    try {
      overdueRecords = await this.repository.findOverdue(referenceDate);
    } catch (error) {
      throw KeyServiceError.from(error, 'REPOSITORY_ERROR', 'Unable to query overdue keys', {
        referenceDate: referenceDate.toISOString(),
      });
    }

    const summary: OverdueAlertSummary = {
      referenceDate,
      totalOverdue: overdueRecords.length,
      alertsSent: 0,
      failures: [],
    };

    for (const record of overdueRecords) {
      const payload: OverdueAlertPayload = {
        keyId: record.keyId,
        userId: record.userId,
        overdueByMs: referenceDate.getTime() - record.dueAt.getTime(),
        record,
      };

      try {
        await this.notificationService.sendOverdueAlert(payload);
        summary.alertsSent += 1;
      } catch (error) {
        summary.failures.push({
          record,
          error: KeyServiceError.from(error, 'NOTIFICATION_ERROR', 'Failed to send overdue alert', {
            keyId: record.keyId,
            userId: record.userId,
            transactionId: record.id,
          }),
        });
      }
    }

    return summary;
  }

  validatePolicies(request: KeyCheckoutRequest): Promise<PolicyValidationResult> {
    return this.policyValidator.validate(request);
  }
}
