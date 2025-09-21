import React, { type ReactElement, type ReactNode } from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'

import {
  AnnouncementsFeed,
  MaintenanceManagement,
  PackagesList,
  ResidentDashboard,
  ResidentDocumentViewer,
  ResidentProfilePreferences,
  __resetResidentApiState,
  __setResidentApiNetworkDelay,
} from '..'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  return { Wrapper, queryClient }
}

const renderWithClient = (ui: ReactElement) => {
  const { Wrapper, queryClient } = createWrapper()
  return { ...render(ui, { wrapper: Wrapper }), queryClient }
}

beforeAll(() => {
  __setResidentApiNetworkDelay(0)
})

beforeEach(() => {
  __resetResidentApiState()
})

describe('ResidentDashboard', () => {
  it('renders resident metrics and passes accessibility review', async () => {
    const { container } = renderWithClient(<ResidentDashboard />)

    await screen.findByRole('heading', { name: /resident dashboard/i })
    expect(screen.getByText(/community balance/i)).toBeInTheDocument()

    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

describe('MaintenanceManagement', () => {
  it('advances request status and remains accessible', async () => {
    const user = userEvent.setup()
    const { container } = renderWithClient(<MaintenanceManagement />)

    const maintenanceTitle = await screen.findByText(/garage door remote issue/i)
    const maintenanceRow = maintenanceTitle.closest('tr')
    expect(maintenanceRow).not.toBeNull()
    const actionButton = within(maintenanceRow as HTMLTableRowElement).getByRole('button', {
      name: /mark as in progress/i,
    })
    await user.click(actionButton)

    await waitFor(() =>
      expect(within(maintenanceRow as HTMLTableRowElement).getByText(/in progress/i)).toBeInTheDocument()
    )

    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

describe('AnnouncementsFeed', () => {
  it('lists announcements with no accessibility violations', async () => {
    const { container } = renderWithClient(<AnnouncementsFeed />)

    await screen.findByRole('heading', { name: /building announcements/i })
    expect(await screen.findAllByRole('listitem')).not.toHaveLength(0)

    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

describe('PackagesList', () => {
  it('acknowledges a package pickup', async () => {
    const user = userEvent.setup()
    const { container } = renderWithClient(<PackagesList />)

    const trackingNumber = await screen.findByText(/1z999999/i)
    const packageRow = trackingNumber.closest('tr')
    expect(packageRow).not.toBeNull()
    const markButton = within(packageRow as HTMLTableRowElement).getByRole('button', {
      name: /mark package 1z999999 as picked up/i,
    })
    await user.click(markButton)

    await waitFor(() =>
      expect(within(packageRow as HTMLTableRowElement).getByText(/confirmed/i)).toBeInTheDocument()
    )

    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

describe('ResidentDocumentViewer', () => {
  it('opens document dialog and meets accessibility expectations', async () => {
    const user = userEvent.setup()
    renderWithClient(<ResidentDocumentViewer />)

    const [openButton] = await screen.findAllByRole('button', { name: /^view$/i })
    await user.click(openButton)

    await screen.findByRole('dialog')

    const results = await axe(document.body)
    expect(results.violations).toHaveLength(0)
  })
})

describe('ResidentProfilePreferences', () => {
  it('updates a preference toggle and reports success accessibly', async () => {
    const user = userEvent.setup()
    const { container } = renderWithClient(<ResidentProfilePreferences />)

    const emailSwitch = await screen.findByRole('switch', { name: /email notifications/i })
    await user.click(emailSwitch)

    await screen.findByText(/preferences updated successfully/i)

    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})
