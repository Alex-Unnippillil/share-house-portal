import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getDocumentsActionMock } = vi.hoisted(() => ({
  getDocumentsActionMock: vi.fn(),
}));

vi.mock('@/app/documents/actions', () => ({
  getDocumentsAction: getDocumentsActionMock,
}));

import { DocumentsList } from '@/app/documents/components/documents-list';
import { MessagingSearchExperience } from '@/components/messaging/messaging-search-experience';
import { MaintenanceSearchExperience } from '@/components/maintenance/maintenance-search-experience';
import { track } from '@vercel/analytics/react';

beforeEach(() => {
  getDocumentsActionMock.mockResolvedValue({ success: true, data: [] });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('zero-results helper surfaces', () => {
  it('surfaces alternate filters in DocumentsList and refetches with the helper filter', async () => {
    const user = userEvent.setup();
    render(<DocumentsList filter={{}} />);

    await screen.findByText(/document library is empty/i);
    await waitFor(() => expect(getDocumentsActionMock).toHaveBeenCalledTimes(1));

    const helperButton = screen.getByRole('button', { name: /View pending signatures/i });
    await user.click(helperButton);

    await waitFor(() => expect(getDocumentsActionMock).toHaveBeenCalledTimes(2));
    const lastCall = getDocumentsActionMock.mock.calls.at(-1);
    expect(lastCall?.[0]).toEqual({ status: ['pending_signature'] });

    expect(track).toHaveBeenCalledWith(
      'documents_empty_helper_selected',
      expect.objectContaining({ helper_id: 'view_pending_signatures', surface: 'card' })
    );
  });

  it('opens the upload dialog from the DocumentsList helper action', async () => {
    const user = userEvent.setup();
    render(<DocumentsList filter={{}} />);

    await screen.findByText(/document library is empty/i);

    const createButton = screen.getByRole('button', { name: /Create document/i });
    await user.click(createButton);

    await screen.findByRole('heading', { name: /Upload Document/i });
    expect(track).toHaveBeenCalledWith(
      'documents_empty_helper_selected',
      expect.objectContaining({ helper_id: 'create_document', surface: 'create_action' })
    );
  });

  it('applies messaging helper chips to reveal curated results', async () => {
    const user = userEvent.setup();
    render(<MessagingSearchExperience />);

    await screen.findByText(/No threads found/i);

    const wifiChip = screen.getByRole('button', { name: /Wi-Fi upgrade/i });
    await user.click(wifiChip);

    await screen.findByText(/Wi-Fi upgrade appointment/i);
    expect(track).toHaveBeenCalledWith(
      'messaging_search_helper_selected',
      expect.objectContaining({ helper_id: 'chip_wifi' })
    );
  });

  it('opens the maintenance quick-create dialog from the helper action', async () => {
    const user = userEvent.setup();
    render(<MaintenanceSearchExperience />);

    await screen.findByText(/No requests match these filters/i);

    const logButton = screen.getByRole('button', { name: /Log a maintenance issue/i });
    await user.click(logButton);

    await screen.findByRole('heading', { name: /Log a maintenance issue/i });
    expect(track).toHaveBeenCalledWith(
      'maintenance_search_helper_selected',
      expect.objectContaining({ helper_id: 'log_request', surface: 'create_action' })
    );
  });
});
