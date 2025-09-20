import { randomBytes } from 'node:crypto'
import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase'
import { ApplicationError, UserError } from '@/lib/errors'

export type VisitorStatus = 'pre_registered' | 'checked_in' | 'checked_out'

export interface VisitorRecord {
  id: string
  tenant_id: string
  host_resident_id: string
  host_resident_name: string | null
  visitor_name: string
  visitor_email: string | null
  visitor_phone: string | null
  expected_arrival: string
  expected_departure: string | null
  status: VisitorStatus
  check_in_at: string | null
  check_out_at: string | null
  badge_code: string | null
  notes: string | null
  created_at: string
  updated_at: string
  pre_registered_by: string
  checked_in_by: string | null
  checked_out_by: string | null
}

export interface Visitor {
  id: string
  tenantId: string
  hostResidentId: string
  hostResidentName: string | null
  visitorName: string
  visitorEmail: string | null
  visitorPhone: string | null
  expectedArrival: string
  expectedDeparture: string | null
  status: VisitorStatus
  checkInAt: string | null
  checkOutAt: string | null
  badgeCode: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  preRegisteredBy: string
  checkedInBy: string | null
  checkedOutBy: string | null
}

export interface PreRegisterResidentInput {
  hostResidentId: string
  hostResidentName?: string | null
  visitorName: string
  visitorEmail?: string | null
  visitorPhone?: string | null
  expectedArrival: string
  expectedDeparture?: string | null
  notes?: string | null
}

export interface CheckInOptions {
  at?: string | Date
  staffMemberId?: string
}

export interface CheckOutOptions {
  at?: string | Date
  staffMemberId?: string
}

export interface VisitorQrCodePayload {
  visitorId: string
  badgeCode: string
  tenantId: string
  hostResidentId: string
  hostResidentName?: string | null
  expectedArrival: string
}

export interface VisitorQrCodeResult {
  pngDataUrl: string
  svg: string
  badgeCode: string
  payload: VisitorQrCodePayload
}

export interface VisitorBadgePdf {
  filename: string
  contentType: 'application/pdf'
  pdf: Buffer
  visitor: Visitor
  qr: VisitorQrCodeResult
}

export interface AuditLogEntry {
  action: string
  entity: string
  entityId: string
  tenantId: string
  actorId: string
  metadata?: Record<string, unknown>
  createdAt?: string
}

export interface AuditLogger {
  log(entry: AuditLogEntry): Promise<void>
}

export interface VisitorArrivalNotificationPayload {
  tenantId: string
  visitorId: string
  visitorName: string
  hostResidentId: string
  hostResidentName?: string | null
  checkInAt: string
  badgeCode: string
  staffMemberId: string
}

export interface VisitorNotificationService {
  sendArrivalNotification(payload: VisitorArrivalNotificationPayload): Promise<void>
}

export interface VisitorServiceOptions {
  tenantId: string
  actorId: string
  auditLogger?: AuditLogger
  notificationService?: VisitorNotificationService
}

export class VisitorService {
  private readonly supabase: SupabaseClient<Database>
  private readonly tenantId: string
  private readonly actorId: string
  private readonly auditLogger: AuditLogger
  private readonly notificationService: VisitorNotificationService

  constructor(
    supabase: SupabaseClient<Database>,
    options: VisitorServiceOptions,
  ) {
    this.supabase = supabase
    this.tenantId = options.tenantId
    this.actorId = options.actorId
    this.auditLogger =
      options.auditLogger ?? new SupabaseAuditLogger(this.supabase)
    this.notificationService =
      options.notificationService ??
      new SupabaseVisitorNotificationService(this.supabase)
  }

  async preRegisterResident(
    input: PreRegisterResidentInput,
  ): Promise<Visitor> {
    const badgeCode = this.generateBadgeCode()
    const now = new Date().toISOString()

    const insertPayload = {
      tenant_id: this.tenantId,
      host_resident_id: input.hostResidentId,
      host_resident_name: input.hostResidentName ?? null,
      visitor_name: input.visitorName,
      visitor_email: input.visitorEmail ?? null,
      visitor_phone: input.visitorPhone ?? null,
      expected_arrival: input.expectedArrival,
      expected_departure: input.expectedDeparture ?? null,
      status: 'pre_registered' as VisitorStatus,
      check_in_at: null,
      check_out_at: null,
      badge_code: badgeCode,
      notes: input.notes ?? null,
      created_at: now,
      updated_at: now,
      pre_registered_by: this.actorId,
      checked_in_by: null,
      checked_out_by: null,
    }

    const { data, error } = await this.fromVisitors()
      .insert(insertPayload)
      .select()
      .single()

    if (error) {
      this.handlePostgrestError('Failed to pre-register visitor.', error)
    }

    const visitor = this.mapVisitor(data as VisitorRecord)

    await this.logAudit('visitor.pre_registered', visitor.id, {
      hostResidentId: input.hostResidentId,
      expectedArrival: input.expectedArrival,
    })

    return visitor
  }

  async checkInVisitor(
    visitorId: string,
    options: CheckInOptions = {},
  ): Promise<Visitor> {
    const visitorRecord = await this.fetchVisitor(visitorId)

    if (visitorRecord.status === 'checked_out') {
      throw new UserError('Visitor has already checked out.')
    }

    if (visitorRecord.status === 'checked_in') {
      throw new UserError('Visitor is already checked in.')
    }

    const checkInAt = this.normalizeDate(options.at)
    const staffMemberId = options.staffMemberId ?? this.actorId

    const { data, error } = await this.fromVisitors()
      .update({
        status: 'checked_in',
        check_in_at: checkInAt,
        checked_in_by: staffMemberId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', visitorId)
      .eq('tenant_id', this.tenantId)
      .select()
      .single()

    if (error) {
      this.handlePostgrestError('Failed to check visitor in.', error)
    }

    const updatedVisitor = this.mapVisitor(data as VisitorRecord)

    await this.logAudit(
      'visitor.checked_in',
      visitorId,
      {
        checkInAt,
        staffMemberId,
      },
      staffMemberId,
    )

    if (!updatedVisitor.badgeCode) {
      await this.ensureBadgeCode(data as VisitorRecord)
    }

    await this.notificationService.sendArrivalNotification({
      tenantId: this.tenantId,
      visitorId,
      visitorName: updatedVisitor.visitorName,
      hostResidentId: updatedVisitor.hostResidentId,
      hostResidentName: updatedVisitor.hostResidentName,
      checkInAt,
      badgeCode: updatedVisitor.badgeCode ?? '',
      staffMemberId,
    })

    await this.logAudit(
      'visitor.arrival_notification_triggered',
      visitorId,
      {
        staffMemberId,
        checkInAt,
      },
      staffMemberId,
    )

    return updatedVisitor
  }

  async checkOutVisitor(
    visitorId: string,
    options: CheckOutOptions = {},
  ): Promise<Visitor> {
    const visitorRecord = await this.fetchVisitor(visitorId)

    if (visitorRecord.status !== 'checked_in') {
      throw new UserError('Visitor must be checked in before checking out.')
    }

    const checkOutAt = this.normalizeDate(options.at)
    const staffMemberId = options.staffMemberId ?? this.actorId

    const { data, error } = await this.fromVisitors()
      .update({
        status: 'checked_out',
        check_out_at: checkOutAt,
        checked_out_by: staffMemberId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', visitorId)
      .eq('tenant_id', this.tenantId)
      .select()
      .single()

    if (error) {
      this.handlePostgrestError('Failed to check visitor out.', error)
    }

    const updatedVisitor = this.mapVisitor(data as VisitorRecord)

    await this.logAudit(
      'visitor.checked_out',
      visitorId,
      {
        checkOutAt,
        staffMemberId,
      },
      staffMemberId,
    )

    return updatedVisitor
  }

  async generateVisitorQrCode(visitorId: string): Promise<VisitorQrCodeResult> {
    const visitorRecord = await this.fetchVisitor(visitorId)
    const withBadgeCode = await this.ensureBadgeCode(visitorRecord)

    const payload: VisitorQrCodePayload = {
      visitorId: withBadgeCode.id,
      badgeCode: withBadgeCode.badge_code!,
      tenantId: withBadgeCode.tenant_id,
      hostResidentId: withBadgeCode.host_resident_id,
      hostResidentName: withBadgeCode.host_resident_name,
      expectedArrival: withBadgeCode.expected_arrival,
    }

    const [pngDataUrl, svg] = await Promise.all([
      QRCode.toDataURL(JSON.stringify(payload), {
        errorCorrectionLevel: 'M',
      }),
      QRCode.toString(JSON.stringify(payload), {
        type: 'svg',
        errorCorrectionLevel: 'M',
      }),
    ])

    await this.logAudit('visitor.qr_generated', visitorId, {
      badgeCode: withBadgeCode.badge_code,
    })

    return {
      pngDataUrl,
      svg,
      badgeCode: withBadgeCode.badge_code!,
      payload,
    }
  }

  async generateBadgePdf(visitorId: string): Promise<VisitorBadgePdf> {
    const visitorRecord = await this.fetchVisitor(visitorId)
    const badgeRecord = await this.ensureBadgeCode(visitorRecord)
    const visitor = this.mapVisitor(badgeRecord)
    const qr = await this.generateVisitorQrCode(visitorId)

    const pdf = await this.renderBadgePdf(badgeRecord, qr.pngDataUrl)

    await this.logAudit('visitor.badge_pdf_generated', visitorId, {
      badgeCode: badgeRecord.badge_code,
    })

    return {
      filename: `${visitor.visitorName.replace(/\s+/g, '_')}_badge.pdf`,
      contentType: 'application/pdf',
      pdf,
      visitor,
      qr,
    }
  }

  private fromVisitors() {
    return (this.supabase as unknown as SupabaseClient<any>).from('visitors')
  }

  private async fetchVisitor(visitorId: string): Promise<VisitorRecord> {
    const { data, error } = await this.fromVisitors()
      .select('*')
      .eq('id', visitorId)
      .eq('tenant_id', this.tenantId)
      .single()

    if (error) {
      this.handlePostgrestError('Unable to load visitor.', error)
    }

    const record = data as VisitorRecord
    this.ensureTenantAccess(record.tenant_id)
    return record
  }

  private ensureTenantAccess(tenantId: string) {
    if (tenantId !== this.tenantId) {
      throw new UserError('Attempt to access a visitor from another tenant.')
    }
  }

  private mapVisitor(record: VisitorRecord): Visitor {
    return {
      id: record.id,
      tenantId: record.tenant_id,
      hostResidentId: record.host_resident_id,
      hostResidentName: record.host_resident_name,
      visitorName: record.visitor_name,
      visitorEmail: record.visitor_email,
      visitorPhone: record.visitor_phone,
      expectedArrival: record.expected_arrival,
      expectedDeparture: record.expected_departure,
      status: record.status,
      checkInAt: record.check_in_at,
      checkOutAt: record.check_out_at,
      badgeCode: record.badge_code,
      notes: record.notes,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
      preRegisteredBy: record.pre_registered_by,
      checkedInBy: record.checked_in_by,
      checkedOutBy: record.checked_out_by,
    }
  }

  private generateBadgeCode(): string {
    return randomBytes(6).toString('hex').toUpperCase()
  }

  private async ensureBadgeCode(
    record: VisitorRecord,
  ): Promise<VisitorRecord> {
    if (record.badge_code) {
      return record
    }

    const badgeCode = this.generateBadgeCode()
    const { data, error } = await this.fromVisitors()
      .update({
        badge_code: badgeCode,
        updated_at: new Date().toISOString(),
      })
      .eq('id', record.id)
      .eq('tenant_id', this.tenantId)
      .select()
      .single()

    if (error) {
      this.handlePostgrestError('Failed to assign badge code.', error)
    }

    await this.logAudit('visitor.badge_code_assigned', record.id, {
      badgeCode,
    })

    return data as VisitorRecord
  }

  private normalizeDate(value?: string | Date): string {
    if (!value) {
      return new Date().toISOString()
    }

    if (value instanceof Date) {
      return value.toISOString()
    }

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      throw new UserError('Invalid date provided.')
    }

    return parsed.toISOString()
  }

  private async logAudit(
    action: string,
    entityId: string,
    metadata?: Record<string, unknown>,
    actorId?: string,
  ) {
    await this.auditLogger.log({
      action,
      entity: 'visitor',
      entityId,
      tenantId: this.tenantId,
      actorId: actorId ?? this.actorId,
      metadata,
    })
  }

  private handlePostgrestError(message: string, error: PostgrestError) {
    throw new ApplicationError(message, { cause: error })
  }

  private async renderBadgePdf(
    visitor: VisitorRecord,
    qrDataUrl: string,
  ): Promise<Buffer> {
    const pdfDoc = new PDFDocument({ size: 'A7', margin: 18 })
    const chunks: Buffer[] = []

    const badgePromise = new Promise<Buffer>((resolve, reject) => {
      pdfDoc.on('data', chunk => chunks.push(chunk))
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)))
      pdfDoc.on('error', reject)

      pdfDoc.fontSize(16).font('Helvetica-Bold').text('VISITOR BADGE', {
        align: 'center',
      })

      pdfDoc.moveDown(0.5)

      pdfDoc.fontSize(12).font('Helvetica-Bold').text(visitor.visitor_name, {
        align: 'center',
      })

      pdfDoc.moveDown(0.25)

      if (visitor.host_resident_name) {
        pdfDoc.fontSize(10).font('Helvetica').text(
          `Visiting: ${visitor.host_resident_name}`,
          {
            align: 'center',
          },
        )
        pdfDoc.moveDown(0.25)
      }

      pdfDoc
        .fontSize(9)
        .font('Helvetica')
        .text(`Arrival: ${this.formatDateTime(visitor.expected_arrival)}`, {
          align: 'center',
        })

      pdfDoc.moveDown(0.75)

      const qrBuffer = this.decodeDataUrl(qrDataUrl)
      pdfDoc.image(qrBuffer, {
        fit: [150, 150],
        align: 'center',
        valign: 'center',
      })

      pdfDoc.moveDown(0.5)

      pdfDoc
        .fontSize(9)
        .font('Helvetica')
        .text(`Badge: ${visitor.badge_code}`, {
          align: 'center',
        })

      pdfDoc.end()
    })

    return badgePromise
  }

  private decodeDataUrl(dataUrl: string): Buffer {
    const match = /^data:[^;]+;base64,(.+)$/.exec(dataUrl)

    if (!match) {
      throw new ApplicationError('QR code data URL is malformed.')
    }

    return Buffer.from(match[1], 'base64')
  }

  private formatDateTime(value: string | null): string {
    if (!value) {
      return 'N/A'
    }

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return value
    }

    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  }
}

export class SupabaseAuditLogger implements AuditLogger {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async log(entry: AuditLogEntry): Promise<void> {
    const auditClient =
      this.supabase as unknown as SupabaseClient<any>

    const { error } = await auditClient.from('audit_logs').insert({
      tenant_id: entry.tenantId,
      actor_id: entry.actorId,
      action: entry.action,
      entity: entry.entity,
      entity_id: entry.entityId,
      metadata: entry.metadata ?? null,
      created_at: entry.createdAt ?? new Date().toISOString(),
    })

    if (error) {
      throw new ApplicationError('Failed to write audit log entry.', {
        cause: error,
      })
    }
  }
}

export class SupabaseVisitorNotificationService
  implements VisitorNotificationService
{
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async sendArrivalNotification(
    payload: VisitorArrivalNotificationPayload,
  ): Promise<void> {
    const notificationClient =
      this.supabase as unknown as SupabaseClient<any>

    const { error } = await notificationClient
      .from('notification_events')
      .insert({
        tenant_id: payload.tenantId,
        event_type: 'visitor.arrival',
        payload,
        status: 'pending',
        created_at: new Date().toISOString(),
      })

    if (error) {
      throw new ApplicationError('Failed to queue arrival notification.', {
        cause: error,
      })
    }
  }
}

export class NoopVisitorNotificationService
  implements VisitorNotificationService
{
  async sendArrivalNotification(): Promise<void> {
    return
  }
}
