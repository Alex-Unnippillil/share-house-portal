import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createClientMock, revalidatePathMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}))

vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
}))

vi.mock('@/utils/supa-server-actions', () => ({
  createClient: createClientMock,
}))

import {
  initialDeletionState,
  initialExportState,
  requestPrivacyExport,
  submitDeletionRequest,
} from '@/app/privacy/dashboard/actions'

describe('privacy dashboard actions', () => {
  beforeEach(() => {
    createClientMock.mockReset()
    revalidatePathMock.mockReset()
  })

  it('invokes the Supabase function to generate an export', async () => {
    const functionsInvoke = vi.fn(async (fnName: string, { body }: any) => {
      expect(fnName).toBe('generate-privacy-export')
      expect(body.user_id).toBe('user-123')
      expect(body.options).toEqual({
        include_documents: true,
        include_messages: true,
        include_requests: false,
      })

      return {
        data: { download_url: 'https://example.com/archive.zip', message: 'Archive ready' },
        error: null,
      }
    })

    const supabaseStub = {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null,
        })),
      },
      functions: {
        invoke: functionsInvoke,
      },
    }

    createClientMock.mockReturnValue(supabaseStub as any)

    const formData = new FormData()
    formData.set('includeDocuments', 'on')
    formData.set('includeMessages', 'true')

    const result = await requestPrivacyExport(initialExportState, formData)

    expect(result.status).toBe('success')
    expect(result.message).toBe('Archive ready')
    expect(result.downloadUrl).toBe('https://example.com/archive.zip')
    expect(functionsInvoke).toHaveBeenCalledTimes(1)
    expect(revalidatePathMock).toHaveBeenCalledWith('/privacy/dashboard')
  })

  it('requires the DELETE confirmation phrase before scheduling deletion', async () => {
    const supabaseStub = {
      auth: {
        getUser: vi.fn(),
      },
      functions: {
        invoke: vi.fn(),
      },
    }

    createClientMock.mockReturnValue(supabaseStub as any)

    const formData = new FormData()
    formData.set('confirmation', 'delete my account')
    formData.set('exportBackup', 'on')

    const result = await submitDeletionRequest(initialDeletionState, formData)

    expect(result.status).toBe('error')
    expect(result.message).toMatch(/Type DELETE/i)
    expect(createClientMock).not.toHaveBeenCalled()
    expect(supabaseStub.functions.invoke).not.toHaveBeenCalled()
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })

  it('schedules deletion via Supabase when confirmation matches', async () => {
    const functionsInvoke = vi.fn(async (fnName: string, { body }: any) => {
      expect(fnName).toBe('schedule-account-deletion')
      expect(body.user_id).toBe('user-456')
      expect(body.export_backup).toBe(true)
      expect(body.reason).toBe('Moving out')

      return {
        data: { message: 'Scheduled' },
        error: null,
      }
    })

    const supabaseStub = {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'user-456', email: 'tenant@example.com' } },
          error: null,
        })),
      },
      functions: {
        invoke: functionsInvoke,
      },
    }

    createClientMock.mockReturnValue(supabaseStub as any)

    const formData = new FormData()
    formData.set('confirmation', 'DELETE ')
    formData.set('reason', '  Moving out  ')
    formData.set('exportBackup', 'on')

    const result = await submitDeletionRequest(initialDeletionState, formData)

    expect(result.status).toBe('success')
    expect(result.message).toBe('Scheduled')
    expect(functionsInvoke).toHaveBeenCalledTimes(1)
    expect(revalidatePathMock).toHaveBeenCalledWith('/privacy/dashboard')
  })
})
