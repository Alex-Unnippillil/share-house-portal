import { PolicyViolationError } from './errors';
import type {
  CustomPolicyRule,
  KeyCheckoutRequest,
  KeyPolicy,
  KeyPolicyRule,
  MaxDurationPolicyRule,
  PolicyEvaluationContext,
  PolicyValidationResult,
  PolicyViolation,
  RolePolicyRule,
  TimeWindowPolicyRule,
} from './types';

export interface KeyPolicyValidatorOptions {
  stopOnFirstViolation?: boolean;
  timezoneFallback?: string;
}

export class KeyPolicyValidator {
  private readonly timezoneFallback: string;

  constructor(private readonly options: KeyPolicyValidatorOptions = {}) {
    this.timezoneFallback = options.timezoneFallback ?? 'UTC';
  }

  async validate(request: KeyCheckoutRequest): Promise<PolicyValidationResult> {
    const policies = request.policies ?? [];
    const violations: PolicyViolation[] = [];
    const evaluatedPolicies: string[] = [];

    if (policies.length === 0) {
      return { passed: true, violations, evaluatedPolicies };
    }

    const now = request.context?.currentTime ?? new Date();

    for (const policy of policies) {
      evaluatedPolicies.push(policy.id);
      const timezone = this.resolveTimezone(policy, request);
      const evaluationContext: PolicyEvaluationContext = { request, now, timezone };
      const passed = await this.evaluatePolicy(policy.rule, evaluationContext);

      if (!passed) {
        violations.push({
          policyId: policy.id,
          message: this.resolveViolationMessage(policy, evaluationContext),
          severity: policy.rule.type === 'custom'
            ? policy.rule.severity ?? policy.severity ?? 'medium'
            : policy.severity ?? 'medium',
        });

        if (this.options.stopOnFirstViolation) {
          break;
        }
      }
    }

    return { passed: violations.length === 0, violations, evaluatedPolicies };
  }

  async assertValid(request: KeyCheckoutRequest): Promise<PolicyValidationResult> {
    const result = await this.validate(request);
    if (!result.passed) {
      throw new PolicyViolationError(result.violations, result);
    }
    return result;
  }

  private resolveTimezone(policy: KeyPolicy, request: KeyCheckoutRequest): string {
    if (policy.rule.type === 'timeWindow' && policy.rule.timeZone) {
      return policy.rule.timeZone;
    }
    return request.context?.timezone ?? this.timezoneFallback;
  }

  private async evaluatePolicy(
    rule: KeyPolicyRule,
    context: PolicyEvaluationContext,
  ): Promise<boolean> {
    switch (rule.type) {
      case 'timeWindow':
        return this.evaluateTimeWindow(rule, context);
      case 'role':
        return this.evaluateRole(rule, context);
      case 'maxDuration':
        return this.evaluateMaxDuration(rule, context);
      case 'custom':
        return this.evaluateCustom(rule, context);
      default: {
        const exhaustiveCheck: never = rule;
        return exhaustiveCheck;
      }
    }
  }

  private evaluateTimeWindow(rule: TimeWindowPolicyRule, context: PolicyEvaluationContext): boolean {
    const zoned = zonedDate(context.now, rule.timeZone ?? context.timezone);

    if (rule.countries?.length) {
      const country = extractCountry(context.request);
      if (!country || !rule.countries.includes(country)) {
        return false;
      }
    }

    if (rule.allowedWeekdays?.length) {
      const weekday = zoned.getUTCDay();
      if (!rule.allowedWeekdays.includes(weekday)) {
        return false;
      }
    }

    const minutes = zoned.getUTCHours() * 60 + zoned.getUTCMinutes();
    const start = rule.startTime ? parseTimeToMinutes(rule.startTime) : undefined;
    const end = rule.endTime ? parseTimeToMinutes(rule.endTime) : undefined;

    if (start === undefined && end === undefined) {
      return true;
    }

    if (start !== undefined && Number.isNaN(start)) {
      return false;
    }

    if (end !== undefined && Number.isNaN(end)) {
      return false;
    }

    if (start !== undefined && end !== undefined) {
      if (start <= end) {
        return minutes >= start && minutes <= end;
      }
      return minutes >= start || minutes <= end;
    }

    if (start !== undefined) {
      return minutes >= start;
    }

    if (end !== undefined) {
      return minutes <= end;
    }

    return true;
  }

  private evaluateRole(rule: RolePolicyRule, context: PolicyEvaluationContext): boolean {
    return rule.allowedRoles.includes(context.request.userRole);
  }

  private evaluateMaxDuration(
    rule: MaxDurationPolicyRule,
    context: PolicyEvaluationContext,
  ): boolean {
    const issuedAt = context.request.issuedAt ?? context.now;
    const diffMs = context.request.expectedReturnAt.getTime() - issuedAt.getTime();
    const diffMinutes = diffMs / 60000;
    return diffMinutes <= rule.maxDurationMinutes;
  }

  private async evaluateCustom(
    rule: CustomPolicyRule,
    context: PolicyEvaluationContext,
  ): Promise<boolean> {
    return rule.validate(context);
  }

  private resolveViolationMessage(policy: KeyPolicy, context: PolicyEvaluationContext): string {
    if (policy.rule.type === 'custom') {
      const { message } = policy.rule;
      if (typeof message === 'function') {
        return message(context);
      }
      if (typeof message === 'string') {
        return message;
      }
    }

    switch (policy.rule.type) {
      case 'timeWindow':
        return `Key can only be checked out between ${policy.rule.startTime ?? '00:00'} and ${
          policy.rule.endTime ?? '23:59'
        } (${policy.rule.timeZone ?? context.timezone}).`;
      case 'role':
        return 'User does not have permission to checkout this key.';
      case 'maxDuration':
        return `Key must be returned within ${policy.rule.maxDurationMinutes} minutes.`;
      case 'custom':
        return 'Custom policy validation failed.';
      default:
        return 'Policy validation failed.';
    }
  }
}

const zonedDate = (input: Date, timeZone: string): Date => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(input);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const year = Number(lookup.year);
  const month = Number(lookup.month) - 1;
  const day = Number(lookup.day);
  const hour = Number(lookup.hour ?? 0);
  const minute = Number(lookup.minute ?? 0);
  const second = Number(lookup.second ?? 0);
  return new Date(Date.UTC(year, month, day, hour, minute, second));
};

const parseTimeToMinutes = (value: string): number => {
  const [hours, minutes] = value.split(':').map(Number);
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return Number.NaN;
  }
  return hours * 60 + minutes;
};

const extractCountry = (request: KeyCheckoutRequest): string | undefined => {
  const attributeCountry = request.context?.attributes?.country;
  if (typeof attributeCountry === 'string') {
    return attributeCountry;
  }
  const metadataCountry = request.metadata?.country;
  return typeof metadataCountry === 'string' ? metadataCountry : undefined;
};
