export type KeyCheckoutStatus =
  | 'pending'
  | 'checked_out'
  | 'returned'
  | 'overdue'
  | 'failed';

export type KeyPolicySeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export interface KeyCheckoutRecord {
  id: string;
  keyId: string;
  userId: string;
  status: KeyCheckoutStatus;
  checkedOutAt: Date;
  dueAt: Date;
  returnedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface PolicyContext {
  /**
   * The point in time that should be used for policy evaluation. Defaults to the
   * current system time when omitted.
   */
  currentTime?: Date;
  /**
   * The timezone that should be used for policies that depend on local time. If a
   * policy provides a timezone it takes precedence over this value.
   */
  timezone?: string;
  /** Arbitrary contextual attributes that policies may inspect. */
  attributes?: Record<string, unknown>;
}

export interface KeyCheckoutRequest {
  keyId: string;
  userId: string;
  userRole: string;
  expectedReturnAt: Date;
  issuedAt?: Date;
  locationId?: string;
  reason?: string;
  context?: PolicyContext;
  policies?: KeyPolicy[];
  metadata?: Record<string, unknown>;
}

export interface KeyReturnRequest {
  transactionId: string;
  keyId: string;
  userId: string;
  returnedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface OverdueAlertPayload {
  keyId: string;
  userId: string;
  /** Milliseconds that the key is overdue. */
  overdueByMs: number;
  record: KeyCheckoutRecord;
}

export interface KeyRepository {
  checkout(request: KeyCheckoutRequest): Promise<KeyCheckoutRecord>;
  return(request: KeyReturnRequest): Promise<KeyCheckoutRecord>;
  findOverdue(referenceDate: Date): Promise<KeyCheckoutRecord[]>;
}

export interface KeyNotificationService {
  sendOverdueAlert(payload: OverdueAlertPayload): Promise<void>;
}

export interface PolicyViolation {
  policyId: string;
  message: string;
  severity: KeyPolicySeverity;
}

export interface PolicyValidationResult {
  passed: boolean;
  violations: PolicyViolation[];
  evaluatedPolicies: string[];
}

export interface TimeWindowPolicyRule {
  type: 'timeWindow';
  /** ISO-3166 alpha-2 country codes for which the rule applies, if restricted. */
  countries?: string[];
  /**
   * ISO weekday numbers (0-6) that the checkout is allowed on. When omitted, all
   * days are permitted.
   */
  allowedWeekdays?: number[];
  /** Time in HH:mm (24h) format. */
  startTime?: string;
  /** Time in HH:mm (24h) format. */
  endTime?: string;
  /** IANA timezone identifier. */
  timeZone?: string;
}

export interface RolePolicyRule {
  type: 'role';
  allowedRoles: string[];
}

export interface MaxDurationPolicyRule {
  type: 'maxDuration';
  /** Maximum duration in minutes. */
  maxDurationMinutes: number;
}

export interface CustomPolicyRule {
  type: 'custom';
  validate: (context: PolicyEvaluationContext) => boolean | Promise<boolean>;
  message?: string | ((context: PolicyEvaluationContext) => string);
  severity?: KeyPolicySeverity;
}

export type KeyPolicyRule =
  | TimeWindowPolicyRule
  | RolePolicyRule
  | MaxDurationPolicyRule
  | CustomPolicyRule;

export interface KeyPolicy {
  id: string;
  name: string;
  description?: string;
  severity?: KeyPolicySeverity;
  rule: KeyPolicyRule;
  metadata?: Record<string, unknown>;
}

export interface PolicyEvaluationContext {
  request: KeyCheckoutRequest;
  now: Date;
  timezone: string;
}

export interface KeyCabinetKeyState {
  slotId: string;
  keyId: string;
  status: 'available' | 'checked_out' | 'maintenance';
  batteryLevel?: number;
  lastUpdatedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface KeyCabinetInventorySnapshot {
  cabinetId: string;
  capturedAt: Date;
  keys: KeyCabinetKeyState[];
}

export interface KeyCabinetAlert {
  cabinetId: string;
  keyId: string;
  slotId: string;
  event: 'door_opened' | 'door_forced' | 'power_loss' | 'tamper' | 'unknown';
  occurredAt: Date;
  severity: KeyPolicySeverity;
  details?: Record<string, unknown>;
}

export interface KeyCabinetAlertStreamOptions {
  pollIntervalMs?: number;
  since?: Date;
  signal?: AbortSignal;
}

export interface KeyCabinetConnector {
  readonly id: string;
  syncInventory(): Promise<KeyCabinetInventorySnapshot>;
  dispatchCheckout(record: KeyCheckoutRecord): Promise<void>;
  dispatchReturn(record: KeyCheckoutRecord): Promise<void>;
  streamAlerts?(options?: KeyCabinetAlertStreamOptions): AsyncIterable<KeyCabinetAlert>;
}
