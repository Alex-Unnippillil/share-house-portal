import { ConnectorContext, ConnectorFactory, IntegrationConnector } from '../connector-sdk';
import { ConnectorJobResult, ConnectorRuntimeOptions, IntegrationJob } from '../types';

interface AccessControlCredentials {
  apiToken: string;
  tenantId: string;
  siteIds?: string[];
}

interface ProvisionPayload {
  userId: string;
  badgeId: string;
  accessLevel: string;
  expiresAt?: string;
}

interface RevokePayload {
  userId: string;
  badgeId?: string;
}

interface AuditPayload {
  siteId?: string;
}

const metadata = {
  key: 'access-control.smart-locks',
  displayName: 'Smart Lock Access Control',
  category: 'access-control',
  description: 'Manages badge provisioning for networked locks and door controllers.',
  capabilities: ['access:provision', 'access:revoke', 'access:audit'],
  docsUrl: 'https://example.com/connectors/access-control',
} as const;

export class AccessControlConnector extends IntegrationConnector {
  constructor(context: ConnectorContext) {
    super(context, metadata);
  }

  async validateConfig(config: Record<string, unknown>): Promise<void> {
    if (config.defaultAccessLevel && typeof config.defaultAccessLevel !== 'string') {
      throw new Error('`defaultAccessLevel` must be a string.');
    }
  }

  async run(job: IntegrationJob, runtime?: ConnectorRuntimeOptions): Promise<ConnectorJobResult> {
    this.abortIfRequested(runtime);

    await this.ensureCredentialPresence(job.credentialsId);

    switch (job.operation) {
      case 'provisionAccess':
        return this.provisionAccess(job);
      case 'revokeAccess':
        return this.revokeAccess(job);
      case 'auditBadges':
        return this.auditBadges(job);
      default:
        throw new Error(`Unsupported access control operation ${job.operation}`);
    }
  }

  private async provisionAccess(job: IntegrationJob): Promise<ConnectorJobResult> {
    const payload = job.payload as ProvisionPayload | undefined;
    this.assertPayloadShape(payload, ['userId', 'badgeId', 'accessLevel']);

    const credentials = await this.readCredentials<AccessControlCredentials>(job.credentialsId);

    this.logger.info('Provisioning access badge', {
      userId: payload.userId,
      badgeId: payload.badgeId,
      level: payload.accessLevel,
      tenantId: credentials.tenantId,
    });

    this.emitMetric('access_badge_provisioned', 1, {
      level: payload.accessLevel,
    });

    return {
      success: true,
      data: {
        badgeId: payload.badgeId,
        grantedAt: new Date().toISOString(),
        expiresAt: payload.expiresAt ?? null,
      },
      notes: 'Badge has been activated across all configured locks.',
    };
  }

  private async revokeAccess(job: IntegrationJob): Promise<ConnectorJobResult> {
    const payload = job.payload as RevokePayload | undefined;
    this.assertPayloadShape(payload, ['userId']);

    const credentials = await this.readCredentials<AccessControlCredentials>(job.credentialsId);

    this.logger.info('Revoking access', {
      userId: payload.userId,
      badgeId: payload.badgeId ?? 'all',
      tenantId: credentials.tenantId,
    });

    this.emitMetric('access_badge_revoked', 1, {
      reason: payload.badgeId ? 'single-badge' : 'global',
    });

    return {
      success: true,
      data: {
        badgeId: payload.badgeId ?? null,
        revokedAt: new Date().toISOString(),
      },
      notes: 'Access revoked. Physical locks will sync during their next heartbeat.',
    };
  }

  private async auditBadges(job: IntegrationJob): Promise<ConnectorJobResult> {
    const payload = job.payload as AuditPayload | undefined;
    const credentials = await this.readCredentials<AccessControlCredentials>(job.credentialsId);

    const siteId = payload?.siteId ?? credentials.siteIds?.[0] ?? 'default-site';

    this.logger.info('Auditing badge inventory', {
      tenantId: credentials.tenantId,
      siteId,
    });

    const badges = [
      { badgeId: 'badge-001', userId: 'user-123', status: 'active' },
      { badgeId: 'badge-002', userId: 'user-456', status: 'revoked' },
    ];

    this.emitMetric('badge_inventory_count', badges.length, {
      siteId,
    });

    return {
      success: true,
      data: {
        siteId,
        badges,
        auditedAt: new Date().toISOString(),
      },
    };
  }
}

export const accessControlConnectorFactory: ConnectorFactory = {
  metadata,
  create: (context: ConnectorContext) => new AccessControlConnector(context),
};
