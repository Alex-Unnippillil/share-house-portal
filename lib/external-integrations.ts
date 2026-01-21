import { getExternalApiConfig } from '@/config/external-apis';
import { CircuitBreaker } from '@/lib/circuit-breaker';

const calComConfig = getExternalApiConfig('CALCOM');
const documensoConfig = getExternalApiConfig('DOCUMENSO');
const googleCalendarConfig = getExternalApiConfig('GOOGLE_CALENDAR');

export const calComCircuitBreaker = new CircuitBreaker({
  name: 'cal.com',
  failureThreshold: calComConfig.failureThreshold,
  cooldownPeriod: calComConfig.cooldownMs,
  halfOpenSuccessThreshold: calComConfig.halfOpenSuccesses,
  cacheTtlMs: calComConfig.cacheTtlMs,
  maxRetries: calComConfig.maxRetries,
  timeoutMs: calComConfig.timeoutMs,
});

export const documensoCircuitBreaker = new CircuitBreaker({
  name: 'documenso',
  failureThreshold: documensoConfig.failureThreshold,
  cooldownPeriod: documensoConfig.cooldownMs,
  halfOpenSuccessThreshold: documensoConfig.halfOpenSuccesses,
  cacheTtlMs: documensoConfig.cacheTtlMs,
  maxRetries: documensoConfig.maxRetries,
  timeoutMs: documensoConfig.timeoutMs,
});

export const googleCalendarCircuitBreaker = new CircuitBreaker({
  name: 'google-calendar',
  failureThreshold: googleCalendarConfig.failureThreshold,
  cooldownPeriod: googleCalendarConfig.cooldownMs,
  halfOpenSuccessThreshold: googleCalendarConfig.halfOpenSuccesses,
  cacheTtlMs: googleCalendarConfig.cacheTtlMs,
  maxRetries: googleCalendarConfig.maxRetries,
  timeoutMs: googleCalendarConfig.timeoutMs,
});
