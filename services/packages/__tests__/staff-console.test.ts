import { describe, expect, it } from 'vitest'

import type {
  CreatePackageRecord,
  FetchEventsOptions,
  FetchPackagesOptions,
  PackageRepository,
  SupplyChainEventRecord,
} from '../repository'
import type { PackageRow, SupplyChainRow } from '../types'
import { getStaffConsoleOverview } from '../service'

class MockPackageRepository implements PackageRepository {
  constructor(private readonly packages: PackageRow[], private readonly events: SupplyChainRow[]) {}

  async createPackage(_record: CreatePackageRecord): Promise<PackageRow> {
    throw new Error('not implemented')
  }

  async findById(_packageId: string): Promise<PackageRow | null> {
    throw new Error('not implemented')
  }

  async findByBarcode(_barcode: string): Promise<PackageRow | null> {
    throw new Error('not implemented')
  }

  async fetchPackagesByIds(_packageIds: string[]): Promise<PackageRow[]> {
    throw new Error('not implemented')
  }

  async updatePackageStatus(_packageId: string, _status: string): Promise<PackageRow> {
    throw new Error('not implemented')
  }

  async updatePackagesStatus(_packageIds: string[], _status: string): Promise<PackageRow[]> {
    throw new Error('not implemented')
  }

  async insertSupplyChainEvent(_event: SupplyChainEventRecord): Promise<void> {
    throw new Error('not implemented')
  }

  async fetchEvents(dataType: string, options: FetchEventsOptions = {}): Promise<SupplyChainRow[]> {
    return this.events.filter((event) => {
      if (event.data_type !== dataType) {
        return false
      }

      if (options.packageIds && options.packageIds.length > 0 && !options.packageIds.includes(event.name)) {
        return false
      }

      if (options.since && event.created_at && event.created_at < options.since) {
        return false
      }

      return true
    })
  }

  async fetchPackages(options: FetchPackagesOptions = {}): Promise<PackageRow[]> {
    if (!options.startDate) {
      return this.packages
    }

    return this.packages.filter((pkg) => pkg.created_at >= options.startDate!)
  }
}

function createPackage(partial: Partial<PackageRow>): PackageRow {
  return {
    id: partial.id ?? 'pkg-' + Math.random().toString(16).slice(2),
    name: partial.name ?? 'Package',
    description: partial.description ?? null,
    type: partial.type ?? null,
    qr_code_url: partial.qr_code_url ?? partial.id ?? 'barcode',
    status: partial.status ?? 'received',
    user_id: partial.user_id ?? 'user-1',
    created_at: partial.created_at ?? new Date().toISOString(),
    updated_at: partial.updated_at ?? partial.created_at ?? new Date().toISOString(),
  }
}

function createEvent(partial: Partial<SupplyChainRow>): SupplyChainRow {
  return {
    id: partial.id ?? 'evt-' + Math.random().toString(16).slice(2),
    name: partial.name ?? 'pkg-unknown',
    data_type: partial.data_type ?? 'package_intake',
    data: partial.data ?? {},
    metadata: partial.metadata ?? null,
    description: partial.description ?? null,
    user_id: partial.user_id ?? 'staff-1',
    created_at: partial.created_at ?? new Date().toISOString(),
    updated_at: partial.updated_at ?? null,
  }
}

describe('getStaffConsoleOverview', () => {
  it('builds reporting and staff dashboard view', async () => {
    const packages: PackageRow[] = [
      createPackage({
        id: 'pkg-1',
        name: 'Coffee beans',
        status: 'received',
        created_at: '2099-07-01T10:00:00.000Z',
        updated_at: '2099-07-01T10:00:00.000Z',
      }),
      createPackage({
        id: 'pkg-2',
        name: 'Tea set',
        status: 'picked_up',
        created_at: '2099-07-02T11:00:00.000Z',
        updated_at: '2099-07-03T12:30:00.000Z',
      }),
    ]

    const events: SupplyChainRow[] = [
      createEvent({
        id: 'evt-intake-1',
        name: 'pkg-1',
        data_type: 'package_intake',
        created_at: '2099-07-01T10:00:00.000Z',
        data: {
          packageId: 'pkg-1',
          recipientEmail: 'alice@example.com',
          recipientName: 'Alice',
          intakeTimestamp: '2099-07-01T10:00:00.000Z',
          createdBy: 'staff-7',
        },
      }),
      createEvent({
        id: 'evt-intake-2',
        name: 'pkg-2',
        data_type: 'package_intake',
        created_at: '2099-07-02T11:00:00.000Z',
        data: {
          packageId: 'pkg-2',
          recipientEmail: 'bob@example.com',
          recipientName: 'Bob',
          intakeTimestamp: '2099-07-02T11:00:00.000Z',
          createdBy: 'staff-7',
        },
      }),
      createEvent({
        id: 'evt-pickup-1',
        name: 'pkg-2',
        data_type: 'package_pickup',
        created_at: '2099-07-03T12:30:00.000Z',
        data: {
          packageId: 'pkg-2',
          pickedUpAt: '2099-07-03T12:30:00.000Z',
          pickedUpBy: 'Bob',
          signatureKey: 'signature-key',
          signatureUrl: 'https://example.com/signatures/pkg-2.png',
        },
      }),
      createEvent({
        id: 'evt-reminder-1',
        name: 'pkg-1',
        data_type: 'package_reminder',
        created_at: '2099-07-05T09:00:00.000Z',
        data: {
          packageId: 'pkg-1',
          reminderSentAt: '2099-07-05T09:00:00.000Z',
          recipientEmail: 'alice@example.com',
          message: 'Please collect your delivery.',
        },
      }),
    ]

    const repo = new MockPackageRepository(packages, events)
    const overview = await getStaffConsoleOverview(repo, { rangeDays: 7 })

    expect(overview.reporting.totals).toEqual({
      received: 1,
      picked_up: 1,
    })

    expect(overview.reporting.timeline).toEqual([
      { date: '2099-07-01', received: 1, pickedUp: 0 },
      { date: '2099-07-02', received: 1, pickedUp: 0 },
      { date: '2099-07-03', received: 0, pickedUp: 1 },
    ])

    expect(overview.awaitingPickup).toEqual([
      {
        id: 'pkg-1',
        name: 'Coffee beans',
        status: 'received',
        created_at: '2099-07-01T10:00:00.000Z',
        recipientEmail: 'alice@example.com',
        recipientName: 'Alice',
      },
    ])

    expect(overview.recentReminders).toEqual([
      {
        packageId: 'pkg-1',
        reminderSentAt: '2099-07-05T09:00:00.000Z',
        recipientEmail: 'alice@example.com',
        message: 'Please collect your delivery.',
      },
    ])

    expect(overview.recentPickups).toEqual([
      {
        packageId: 'pkg-2',
        pickedUpAt: '2099-07-03T12:30:00.000Z',
        pickedUpBy: 'Bob',
        signatureKey: 'signature-key',
        signatureUrl: 'https://example.com/signatures/pkg-2.png',
        notes: undefined,
      },
    ])
  })
})
