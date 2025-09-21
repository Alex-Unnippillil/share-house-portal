export interface IntegrationLogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export class ConsoleIntegrationLogger implements IntegrationLogger {
  constructor(public readonly scope: string) {}

  private format(message: string, context?: Record<string, unknown>): string {
    const contextString = context ? ` ${JSON.stringify(context)}` : '';
    return `[${this.scope}] ${message}${contextString}`;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    // eslint-disable-next-line no-console
    console.debug(this.format(message, context));
  }

  info(message: string, context?: Record<string, unknown>): void {
    // eslint-disable-next-line no-console
    console.info(this.format(message, context));
  }

  warn(message: string, context?: Record<string, unknown>): void {
    // eslint-disable-next-line no-console
    console.warn(this.format(message, context));
  }

  error(message: string, context?: Record<string, unknown>): void {
    // eslint-disable-next-line no-console
    console.error(this.format(message, context));
  }
}

export const createScopedLogger = (
  scope: string,
  baseLogger?: IntegrationLogger,
): IntegrationLogger => {
  if (!baseLogger) {
    return new ConsoleIntegrationLogger(scope);
  }

  if (baseLogger instanceof ConsoleIntegrationLogger) {
    return new ConsoleIntegrationLogger(`${baseLogger.scope}:${scope}`);
  }

  return {
    debug: (message, context) => baseLogger.debug(message, { scope, ...context }),
    info: (message, context) => baseLogger.info(message, { scope, ...context }),
    warn: (message, context) => baseLogger.warn(message, { scope, ...context }),
    error: (message, context) => baseLogger.error(message, { scope, ...context }),
  };
};
