import { ConnectorContext, ConnectorFactory, IntegrationConnector } from '../connector-sdk';
import { ConnectorJobResult, ConnectorRuntimeOptions, IntegrationJob } from '../types';

interface PackageLockerCredentials {
  clientId: string;
  clientSecret: string;
  networkId: string;
}

interface RegisterParcelPayload {
  parcelId: string;
  recipientCode: string;
  size: 'small' | 'medium' | 'large';
  expectedPickupAt?: string;
}

interface ReleaseParcelPayload {
  parcelId: string;
  lockerId?: string;
}

interface AuditLockerPayload {
  lockerId?: string;
}

const metadata = {
  key: 'logistics.package-locker',
  displayName: 'Package Locker Network',
  category: 'logistics',
  description: 'Interfaces with parcel locker providers for deliveries and pick-ups.',
  capabilities: ['parcel:register', 'parcel:release', 'locker:audit'],
  docsUrl: 'https://example.com/connectors/package-locker',
} as const;

export class PackageLockerConnector extends IntegrationConnector {
  constructor(context: ConnectorContext) {
    super(context, metadata);
  }

  validateConfig(config: Record<string, unknown>): void {
    if (config.defaultLocker && typeof config.defaultLocker !== 'string') {
      throw new Error('`defaultLocker` must be a string when supplied.');
    }
  }

  async run(job: IntegrationJob, runtime?: ConnectorRuntimeOptions): Promise<ConnectorJobResult> {
    this.abortIfRequested(runtime);

    switch (job.operation) {
      case 'registerParcel':
        return this.registerParcel(job);
      case 'releaseParcel':
        return this.releaseParcel(job);
      case 'auditLockers':
        return this.auditLockers(job);
      default:
        throw new Error(`Unsupported package locker operation ${job.operation}`);
    }
  }

  private async registerParcel(job: IntegrationJob): Promise<ConnectorJobResult> {
    const payload = job.payload as RegisterParcelPayload | undefined;
    this.assertPayloadShape(payload, ['parcelId', 'recipientCode', 'size']);

    const credentials = await this.readCredentials<PackageLockerCredentials>(job.credentialsId);

    this.logger.info('Registering parcel in locker network', {
      parcelId: payload.parcelId,
      size: payload.size,
      networkId: credentials.networkId,
    });

    this.emitMetric('parcel_registered', 1, {
      size: payload.size,
    });

    const lockerFromConfig =
      typeof job.config?.['lockerId'] === 'string' ? (job.config?.['lockerId'] as string) : undefined;

    return {
      success: true,
      data: {
        parcelId: payload.parcelId,
        accessCode: payload.recipientCode,
        lockerId: lockerFromConfig ?? 'locker-101',
      },
      notes: 'Parcel registered and locker assigned.',
    };
  }

  private async releaseParcel(job: IntegrationJob): Promise<ConnectorJobResult> {
    const payload = job.payload as ReleaseParcelPayload | undefined;
    this.assertPayloadShape(payload, ['parcelId']);

    const credentials = await this.readCredentials<PackageLockerCredentials>(job.credentialsId);

    this.logger.info('Releasing parcel', {
      parcelId: payload.parcelId,
      lockerId: payload.lockerId ?? 'auto',
      networkId: credentials.networkId,
    });

    this.emitMetric('parcel_released', 1, {
      lockerId: payload.lockerId ?? 'auto',
    });

    return {
      success: true,
      data: {
        parcelId: payload.parcelId,
        releasedAt: new Date().toISOString(),
      },
    };
  }

  private async auditLockers(job: IntegrationJob): Promise<ConnectorJobResult> {
    const payload = job.payload as AuditLockerPayload | undefined;
    const credentials = await this.readCredentials<PackageLockerCredentials>(job.credentialsId);

    const lockerFromConfig =
      typeof job.config?.['lockerId'] === 'string' ? (job.config?.['lockerId'] as string) : undefined;
    const lockerId = payload?.lockerId ?? lockerFromConfig ?? 'locker-101';

    this.logger.info('Auditing locker availability', {
      lockerId,
      networkId: credentials.networkId,
    });

    const lockers = [
      { lockerId: 'locker-101', available: 3, total: 10 },
      { lockerId: 'locker-102', available: 1, total: 12 },
    ];

    this.emitMetric('locker_slots_available', lockers.reduce((sum, locker) => sum + locker.available, 0));

    return {
      success: true,
      data: {
        lockerId,
        lockers,
        auditedAt: new Date().toISOString(),
      },
    };
  }
}

export const packageLockerConnectorFactory: ConnectorFactory = {
  metadata,
  create: (context: ConnectorContext) => new PackageLockerConnector(context),
};
