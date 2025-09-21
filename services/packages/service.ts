import { randomUUID } from 'crypto'

import type { BulkActionInput, PackageIntakeInput, PackagePickupInput, ReminderInput, ReportingInput, StaffOverviewInput } from './schemas'
import type { NotificationProvider } from './notifications'
import type { SignatureStorage } from './signature-storage'
import type { PackageRepository } from './repository'
import { PackageServiceError } from './errors'
import { sanitizeJsonRecord } from './utils'
import type {
  PackageReporting,
  PackageRow,
  PickupEventPayload,
  ReminderEventPayload,
  StaffConsoleOverview,
} from './types'

const DAY_IN_MS = 86_400_000

function nowIso() {
  return new Date().toISOString()
}

function getSinceIso(rangeDays: number) {
  const since = new Date()
  since.setHours(0, 0, 0, 0)
  since.setDate(since.getDate() - (rangeDays - 1))
  return since.toISOString()
}

function parseEventData<T>(eventData: unknown): Partial<T> {
  if (!eventData || typeof eventData !== 'object') {
    return {}
  }

  return eventData as Partial<T>
}

async function getIntakeMap(repo: PackageRepository, packageIds: string[]) {
  const events = await repo.fetchEvents('package_intake', { packageIds })
  const map = new Map<string, { recipientEmail?: string; recipientName?: string; createdBy?: string }>()

  for (const event of events) {
    const data = parseEventData<{
      recipientEmail?: string
      recipientName?: string
      createdBy?: string
    }>(event.data)
    map.set(event.name ?? '', {
      recipientEmail: data.recipientEmail,
      recipientName: data.recipientName,
      createdBy: data.createdBy,
    })
  }

  return map
}

export async function intakePackage(
  repo: PackageRepository,
  input: PackageIntakeInput,
  notifications?: NotificationProvider | null
) {
  const packageId = input.barcode ?? randomUUID()
  const barcode = input.barcode ?? packageId

  const record = await repo.createPackage({
    packageId,
    name: input.name,
    description: input.description,
    type: input.type,
    userId: input.userId,
    barcode,
    status: 'received',
  })

  await repo.insertSupplyChainEvent({
    packageId,
    userId: input.createdBy,
    dataType: 'package_intake',
    data: sanitizeJsonRecord({
      packageId,
      recipientEmail: input.recipientEmail,
      recipientName: input.recipientName,
      intakeTimestamp: nowIso(),
      metadata: input.metadata,
      createdBy: input.createdBy,
    }),
  })

  if (notifications && input.notifyRecipient && input.recipientEmail) {
    await notifications.sendIntakeNotification({
      package: record,
      recipientEmail: input.recipientEmail,
      recipientName: input.recipientName,
    })
  }

  return { package: record }
}

export async function lookupPackage(repo: PackageRepository, barcode: string) {
  const record = await repo.findByBarcode(barcode)

  if (!record) {
    throw new PackageServiceError('Package not found', 404)
  }

  const [intakeEvents, pickupEvents, reminderEvents] = await Promise.all([
    repo.fetchEvents('package_intake', { packageIds: [record.id] }),
    repo.fetchEvents('package_pickup', { packageIds: [record.id] }),
    repo.fetchEvents('package_reminder', { packageIds: [record.id] }),
  ])

  return {
    package: record,
    events: {
      intake: intakeEvents,
      pickups: pickupEvents,
      reminders: reminderEvents,
    },
  }
}

export async function recordPackagePickup(
  repo: PackageRepository,
  storage: SignatureStorage,
  input: PackagePickupInput,
  notifications?: NotificationProvider | null
) {
  const record = await repo.findById(input.packageId)

  if (!record) {
    throw new PackageServiceError('Package not found', 404)
  }

  const signature = await storage.storeSignature(input.packageId, input.signature)
  const pickedUpAt = input.pickedUpAt ?? nowIso()

  const updated = await repo.updatePackageStatus(input.packageId, 'picked_up')

  await repo.insertSupplyChainEvent({
    packageId: input.packageId,
    userId: record.user_id,
    dataType: 'package_pickup',
    data: sanitizeJsonRecord({
      packageId: input.packageId,
      pickedUpBy: input.pickedUpBy,
      pickedUpAt,
      signatureKey: signature.key,
      signatureUrl: signature.url,
      notes: input.notes,
    }),
  })

  const intakeMap = await getIntakeMap(repo, [input.packageId])
  const intake = intakeMap.get(input.packageId)

  const recipientEmail = input.recipientEmail ?? intake?.recipientEmail
  const recipientName = input.recipientName ?? intake?.recipientName

  if (notifications && recipientEmail) {
    await notifications.sendPickupNotification({
      package: updated,
      recipientEmail,
      recipientName,
      pickedUpBy: input.pickedUpBy,
      pickedUpAt,
    })
  }

  return {
    package: updated,
    signature,
  }
}

function packageIsOlderThan(pkg: PackageRow, days: number) {
  if (days <= 0) {
    return true
  }

  const created = new Date(pkg.created_at).getTime()
  const cutoff = Date.now() - days * DAY_IN_MS
  return created <= cutoff
}

export async function sendPackageReminders(
  repo: PackageRepository,
  notifications: NotificationProvider | null,
  input: ReminderInput
) {
  const packages = await repo.fetchPackagesByIds(input.packageIds)
  const intakeMap = await getIntakeMap(repo, packages.map((pkg) => pkg.id))

  const reminders: ReminderEventPayload[] = []
  const failures: Array<{ packageId: string; reason: string }> = []

  for (const pkg of packages) {
    if (pkg.status === 'picked_up') {
      continue
    }

    if (!packageIsOlderThan(pkg, input.remindAfterDays ?? 0)) {
      continue
    }

    const intake = intakeMap.get(pkg.id)
    const recipientEmail = intake?.recipientEmail

    if (!recipientEmail) {
      failures.push({ packageId: pkg.id, reason: 'missing-recipient-email' })
      continue
    }

    const reminderPayload: ReminderEventPayload = {
      packageId: pkg.id,
      reminderSentAt: nowIso(),
      message: input.message,
      recipientEmail,
    }

    await repo.insertSupplyChainEvent({
      packageId: pkg.id,
      userId: pkg.user_id,
      dataType: 'package_reminder',
      data: sanitizeJsonRecord(reminderPayload),
    })

    if (notifications) {
      try {
        await notifications.sendReminderNotification({
          package: pkg,
          recipientEmail,
          message: input.message,
        })
      } catch (error) {
        failures.push({ packageId: pkg.id, reason: error instanceof Error ? error.message : 'failed' })
        continue
      }
    }

    reminders.push(reminderPayload)
  }

  return {
    remindersSent: reminders.length,
    reminders,
    failures,
  }
}

export async function applyBulkActions(
  repo: PackageRepository,
  notifications: NotificationProvider | null,
  input: BulkActionInput
) {
  if (input.action.type === 'status') {
    const updated = await repo.updatePackagesStatus(input.packageIds, input.action.status)
    return { updated }
  }

  return sendPackageReminders(repo, notifications, {
    packageIds: input.packageIds,
    message: input.action.message,
    remindAfterDays: input.action.remindAfterDays ?? 0,
  })
}

function buildTimeline(
  packages: PackageRow[],
  pickupEvents: PickupEventPayload[]
): PackageReporting['timeline'] {
  const timeline = new Map<string, { received: number; pickedUp: number }>()

  for (const pkg of packages) {
    const date = pkg.created_at.slice(0, 10)
    const entry = timeline.get(date) ?? { received: 0, pickedUp: 0 }
    entry.received += 1
    timeline.set(date, entry)
  }

  for (const event of pickupEvents) {
    const date = event.pickedUpAt.slice(0, 10)
    const entry = timeline.get(date) ?? { received: 0, pickedUp: 0 }
    entry.pickedUp += 1
    timeline.set(date, entry)
  }

  return Array.from(timeline.entries())
    .map(([date, counts]) => ({ date, ...counts }))
    .sort((a, b) => (a.date > b.date ? 1 : -1))
}

function toPickupPayload(event: unknown): PickupEventPayload | null {
  const data = parseEventData<PickupEventPayload>(event)
  if (!data.packageId || !data.pickedUpAt || !data.pickedUpBy || !data.signatureKey || !data.signatureUrl) {
    return null
  }

  return {
    packageId: data.packageId,
    pickedUpAt: data.pickedUpAt,
    pickedUpBy: data.pickedUpBy,
    signatureKey: data.signatureKey,
    signatureUrl: data.signatureUrl,
    notes: data.notes,
  }
}

function toReminderPayload(event: unknown): ReminderEventPayload | null {
  const data = parseEventData<ReminderEventPayload>(event)
  if (!data.packageId || !data.reminderSentAt || !data.recipientEmail) {
    return null
  }

  return {
    packageId: data.packageId,
    reminderSentAt: data.reminderSentAt,
    message: data.message,
    recipientEmail: data.recipientEmail,
  }
}

export async function getPackageReporting(
  repo: PackageRepository,
  input: ReportingInput
): Promise<PackageReporting> {
  const sinceIso = getSinceIso(input.rangeDays)
  const packages = await repo.fetchPackages({ startDate: sinceIso })

  const totals = packages.reduce<Record<string, number>>((acc, pkg) => {
    acc[pkg.status] = (acc[pkg.status] ?? 0) + 1
    return acc
  }, {})

  const pickupEventsRaw = await repo.fetchEvents('package_pickup', { since: sinceIso })
  const reminderEventsRaw = await repo.fetchEvents('package_reminder', { since: sinceIso })

  const pickupEvents: PickupEventPayload[] = []
  for (const event of pickupEventsRaw) {
    const payload = toPickupPayload(event.data)
    if (payload) {
      pickupEvents.push(payload)
    }
  }

  const reminderEvents: ReminderEventPayload[] = []
  for (const event of reminderEventsRaw) {
    const payload = toReminderPayload(event.data)
    if (payload) {
      reminderEvents.push(payload)
    }
  }

  const timeline = buildTimeline(packages, pickupEvents)

  return {
    totals,
    timeline,
    pickups: pickupEvents.length,
    reminders: reminderEvents.length,
  }
}

export async function getStaffConsoleOverview(
  repo: PackageRepository,
  input: StaffOverviewInput
): Promise<StaffConsoleOverview> {
  const reporting = await getPackageReporting(repo, input)
  const sinceIso = getSinceIso(input.rangeDays)
  const packages = await repo.fetchPackages({ startDate: sinceIso })
  const awaiting = packages.filter((pkg) => pkg.status !== 'picked_up')
  const intakeMap = await getIntakeMap(repo, awaiting.map((pkg) => pkg.id))

  const awaitingPickup = awaiting.map((pkg) => {
    const intake = intakeMap.get(pkg.id)
    return {
      id: pkg.id,
      name: pkg.name,
      status: pkg.status,
      created_at: pkg.created_at,
      recipientEmail: intake?.recipientEmail,
      recipientName: intake?.recipientName,
    }
  })

  const reminderEventsRaw = await repo.fetchEvents('package_reminder', { since: sinceIso })
  const pickupEventsRaw = await repo.fetchEvents('package_pickup', { since: sinceIso })

  const recentReminders = reminderEventsRaw
    .map((event) => toReminderPayload(event.data))
    .filter((event): event is ReminderEventPayload => event !== null)
  const recentPickups = pickupEventsRaw
    .map((event) => toPickupPayload(event.data))
    .filter((event): event is PickupEventPayload => event !== null)

  return {
    reporting,
    awaitingPickup,
    recentReminders,
    recentPickups,
  }
}
