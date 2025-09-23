/**
 * @vitest-environment jsdom
 */

import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom/vitest'
import type { DocumentWithLease } from '@/types/documents'
import { DocumentList } from '@/app/documents/components/documents-list'
import { useUploadDocumentMutation } from '@/hooks/use-document-mutations'
import { MaintenanceRequestForm } from '@/components/maintenance/maintenance-request-form'
import { VisitorBookingForm } from '@/components/visitors/visitor-booking-form'

vi.mock('@/app/documents/components/document-actions', () => ({
  DocumentActions: () => null,
}));

const mockGetDocumentsAction = vi.fn()
const mockUploadDocumentAction = vi.fn()

vi.mock('@/app/documents/actions', () => ({
  getDocumentsAction: (...args: any[]) => mockGetDocumentsAction(...args),
  uploadDocumentAction: (...args: any[]) => mockUploadDocumentAction(...args),
}));

const mockNotifyMaintenanceRequest = vi.fn()
const mockNotifyVisitorBooking = vi.fn()

vi.mock('@/hooks/use-notifications', () => ({
  useNotifications: () => ({
    notifyMaintenanceRequest: mockNotifyMaintenanceRequest,
    notifyVisitorBooking: mockNotifyVisitorBooking,
  }),
}));

const mockFetchMemberProfile = vi.fn()
const mockFetchMembersByUnit = vi.fn()

vi.mock('@/lib/data/members', () => ({
  fetchMemberProfile: (...args: any[]) => mockFetchMemberProfile(...args),
  fetchMembersByUnit: (...args: any[]) => mockFetchMembersByUnit(...args),
}));

const mockToast = vi.fn()

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

(globalThis as any).React = React

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

let maintenanceInsertDeferred: Deferred<{ data: any; error: any }>
let visitorInsertDeferred: Deferred<{ data: any; error: any }>

const supabaseAuthGetUser = vi.fn()

vi.mock('@/utils/supabase-browser', () => ({
  createClient: () => ({
    auth: {
      getUser: supabaseAuthGetUser,
    },
    from: (table: string) => {
      if (table === 'maintenance_requests') {
        return {
          insert: () => ({
            select: () => ({
              single: () => maintenanceInsertDeferred.promise,
            }),
          }),
        }
      }

      if (table === 'visitor_logs') {
        return {
          insert: () => ({
            select: () => ({
              single: () => visitorInsertDeferred.promise,
            }),
          }),
        }
      }

      throw new Error(`Unexpected table ${table}`)
    },
  }),
}))

function renderWithClient(ui: React.ReactNode, client?: QueryClient) {
  const queryClient =
    client ??
    new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

  const result = render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  )

  return { queryClient, ...result }
}

function createOptimisticDocument(title: string): DocumentWithLease {
  const now = new Date().toISOString()
  return {
    id: `temp-${now}`,
    created_at: now,
    updated_at: now,
    title,
    description: 'Optimistic document placeholder',
    document_type: 'other',
    status: 'draft',
    file_url: undefined,
    documenso_envelope_id: undefined,
    documenso_template_id: undefined,
    metadata: { optimistic: true },
    created_by: undefined,
    property_id: undefined,
    tenant_id: undefined,
    unit_id: undefined,
    requires_signature: false,
    expires_at: undefined,
    signed_at: undefined,
    version: 1,
    parent_document_id: undefined,
    lease: undefined,
    signatures: [],
  }
}

function DocumentTestHarness() {
  const mutation = useUploadDocumentMutation()

  const handleUpload = () => {
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', 'Optimistic Document')
    formData.append('description', 'Testing optimistic upload flow')
    formData.append('document_type', 'other')
    formData.append('tenant_id', '')
    formData.append('unit_id', '')
    formData.append('requires_signature', 'false')
    formData.append('expires_at', '')

    mutation.mutate({
      formData,
      optimisticDocument: createOptimisticDocument('Optimistic Document'),
    })
  }

  return (
    <div>
      <button onClick={handleUpload}>Trigger Upload</button>
      <DocumentList filter={{}} />
      {mutation.isError && <div role="alert">Upload failed</div>}
    </div>
  )
}

beforeEach(() => {
  maintenanceInsertDeferred = createDeferred()
  visitorInsertDeferred = createDeferred()
  supabaseAuthGetUser.mockResolvedValue({
    data: { user: { id: 'user-1', email: 'user@example.com' } },
  })

  mockFetchMemberProfile.mockResolvedValue({
    id: 'user-1',
    full_name: 'Test User',
    unit_id: 'unit-1',
  })

  mockFetchMembersByUnit.mockImplementation(
    async (_client, _unitId, options?: { roles?: string[]; excludeUserId?: string }) => {
      if (options?.roles?.includes('property_manager')) {
        return [
          {
            id: 'pm-1',
            email: 'pm@example.com',
            full_name: 'PM',
            role: 'property_manager',
          },
        ]
      }

      return [
        {
          id: 'pm-1',
          email: 'pm@example.com',
          full_name: 'PM',
          role: 'property_manager',
        },
        {
          id: 'roommate-1',
          email: 'roommate@example.com',
          full_name: 'Roommate',
          role: 'roommate',
        },
      ]
    },
  )

  mockGetDocumentsAction.mockReset()
  mockUploadDocumentAction.mockReset()
  mockNotifyMaintenanceRequest.mockReset()
  mockNotifyVisitorBooking.mockReset()
  mockToast.mockReset()
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('document upload optimistic updates', () => {
  it('adds documents optimistically and keeps the server response', async () => {
    const initialDocument: DocumentWithLease = {
      id: 'doc-1',
      created_at: '2024-06-01T00:00:00.000Z',
      updated_at: '2024-06-01T00:00:00.000Z',
      title: 'Existing Document',
      description: 'Already synced document',
      document_type: 'other',
      status: 'draft',
      file_url: undefined,
      documenso_envelope_id: undefined,
      documenso_template_id: undefined,
      metadata: {},
      created_by: undefined,
      property_id: undefined,
      tenant_id: undefined,
      unit_id: undefined,
      requires_signature: false,
      expires_at: undefined,
      signed_at: undefined,
      version: 1,
      parent_document_id: undefined,
      lease: undefined,
      signatures: [],
    }

    let serverDocuments: DocumentWithLease[] = [initialDocument]

    mockGetDocumentsAction.mockImplementation(async () => ({
      success: true,
      data: serverDocuments,
    }))

    const deferred = createDeferred<{ success: boolean; data?: any; error?: string }>()
    mockUploadDocumentAction.mockReturnValue(deferred.promise)

    renderWithClient(<DocumentTestHarness />)

    expect(await screen.findByText('Existing Document')).toBeInTheDocument()

    await userEvent.click(screen.getByText('Trigger Upload'))

    await waitFor(() =>
      expect(screen.getByText('Optimistic Document')).toBeInTheDocument(),
    )

    const persistedDocument: DocumentWithLease = {
      ...initialDocument,
      id: 'doc-optimistic',
      title: 'Server Document Title',
      updated_at: '2024-07-01T00:00:00.000Z',
    }

    serverDocuments = [persistedDocument, initialDocument]
    deferred.resolve({ success: true, data: persistedDocument })

    await waitFor(() =>
      expect(screen.getByText('Server Document Title')).toBeInTheDocument(),
    )
  })

  it('rolls back optimistic documents when the upload fails', async () => {
    const initialDocument: DocumentWithLease = {
      id: 'doc-1',
      created_at: '2024-06-01T00:00:00.000Z',
      updated_at: '2024-06-01T00:00:00.000Z',
      title: 'Existing Document',
      description: 'Already synced document',
      document_type: 'other',
      status: 'draft',
      file_url: undefined,
      documenso_envelope_id: undefined,
      documenso_template_id: undefined,
      metadata: {},
      created_by: undefined,
      property_id: undefined,
      tenant_id: undefined,
      unit_id: undefined,
      requires_signature: false,
      expires_at: undefined,
      signed_at: undefined,
      version: 1,
      parent_document_id: undefined,
      lease: undefined,
      signatures: [],
    }

    mockGetDocumentsAction.mockResolvedValue({ success: true, data: [initialDocument] })

    const deferred = createDeferred<{ success: boolean; data?: any; error?: string }>()
    mockUploadDocumentAction.mockReturnValue(deferred.promise)

    renderWithClient(<DocumentTestHarness />)

    expect(await screen.findByText('Existing Document')).toBeInTheDocument()

    await userEvent.click(screen.getByText('Trigger Upload'))

    await waitFor(() =>
      expect(screen.getByText('Optimistic Document')).toBeInTheDocument(),
    )

    deferred.reject(new Error('Upload failed'))

    await waitFor(() =>
      expect(screen.queryByText('Optimistic Document')).not.toBeInTheDocument(),
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Upload failed')
  })
})

describe('maintenance request optimistic messaging', () => {
  it('shows optimistic success and confirms once persisted', async () => {
    const requestResult = {
      id: 'req-1',
      title: 'Broken sink',
      status: 'pending',
      priority: 'high',
      created_at: '2024-07-01T00:00:00.000Z',
    }

    renderWithClient(
      <MaintenanceRequestForm
        initialValues={{
          title: 'Broken sink',
          description: 'Sink has been leaking continuously for three days.',
          priority: 'high',
        }}
      />,
    )

    await userEvent.click(
      screen.getByRole('button', { name: /submit maintenance request/i }),
    )

    expect(
      screen.getByText('Maintenance request submitted. Syncing with server...'),
    ).toBeInTheDocument()

    maintenanceInsertDeferred.resolve({ data: requestResult, error: null })

    await waitFor(() =>
      expect(
        screen.getByText('Maintenance request synced successfully.'),
      ).toBeInTheDocument(),
    )

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Maintenance request submitted',
      description:
        'Your maintenance request has been submitted and notifications sent.',
    })
  })

  it('rolls back the optimistic message on failure', async () => {
    renderWithClient(
      <MaintenanceRequestForm
        initialValues={{
          title: 'Broken sink',
          description: 'Sink has been leaking continuously for three days.',
        }}
      />,
    )

    await userEvent.click(
      screen.getByRole('button', { name: /submit maintenance request/i }),
    )

    expect(
      screen.getByText('Maintenance request submitted. Syncing with server...'),
    ).toBeInTheDocument()

    maintenanceInsertDeferred.resolve({ data: null, error: { message: 'Insert failed' } })

    await waitFor(() =>
      expect(
        screen.queryByText('Maintenance request submitted. Syncing with server...'),
      ).not.toBeInTheDocument(),
    )

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'Insert failed',
      variant: 'destructive',
    })
  })
})

describe('visitor booking optimistic messaging', () => {
  it('shows optimistic success state before the booking is saved', async () => {
    const bookingResult = {
      id: 'booking-1',
      guest_name: 'Jamie Guest',
      status: 'pending',
      check_in_date: '2024-08-10T00:00:00.000Z',
      check_out_date: '2024-08-12T00:00:00.000Z',
    }

    renderWithClient(
      <VisitorBookingForm
        initialValues={{
          guestName: 'Jamie Guest',
          guestEmail: 'guest@example.com',
          purpose: 'Weekend stay for out-of-town family member',
          checkInDate: new Date('2024-08-10T00:00:00.000Z'),
          checkOutDate: new Date('2024-08-12T00:00:00.000Z'),
        }}
      />,
    )

    await userEvent.click(
      screen.getByRole('button', { name: /submit visitor booking/i }),
    )

    expect(
      screen.getByText('Visitor booking submitted. Syncing with server...'),
    ).toBeInTheDocument()

    visitorInsertDeferred.resolve({ data: bookingResult, error: null })

    await waitFor(() =>
      expect(
        screen.getByText('Visitor booking synced successfully.'),
      ).toBeInTheDocument(),
    )

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Visitor booking submitted',
      description: 'Your visitor booking has been submitted and notifications sent.',
    })
  })

  it('clears the optimistic banner when the booking fails', async () => {
    renderWithClient(
      <VisitorBookingForm
        initialValues={{
          guestName: 'Jamie Guest',
          guestEmail: 'guest@example.com',
          purpose: 'Weekend stay for out-of-town family member',
          checkInDate: new Date('2024-08-10T00:00:00.000Z'),
          checkOutDate: new Date('2024-08-12T00:00:00.000Z'),
        }}
      />,
    )

    await userEvent.click(
      screen.getByRole('button', { name: /submit visitor booking/i }),
    )

    expect(
      screen.getByText('Visitor booking submitted. Syncing with server...'),
    ).toBeInTheDocument()

    visitorInsertDeferred.resolve({
      data: null,
      error: { message: 'Booking failed' },
    })

    await waitFor(() =>
      expect(
        screen.queryByText('Visitor booking submitted. Syncing with server...'),
      ).not.toBeInTheDocument(),
    )

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'Booking failed',
      variant: 'destructive',
    })
  })
})
