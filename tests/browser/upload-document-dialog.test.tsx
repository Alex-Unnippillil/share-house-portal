import React from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

import { UploadDocumentDialog } from '@/app/documents/components/upload-document-dialog';

const mockRouter = vi.hoisted(() => ({ refresh: vi.fn() }));
const mockUploadDocumentAction = vi.hoisted(() => vi.fn().mockResolvedValue({ success: true }));

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

vi.mock('@/app/documents/components/../actions', () => ({
  uploadDocumentAction: mockUploadDocumentAction,
}));

vi.mock('@/hooks/use-document-permissions', () => ({
  useDocumentPermissions: () => ({ canUploadDocuments: true }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('next/image', () => ({
  default: (props: any) => {
    const { fill, priority, quality, ...rest } = props;
    return <img {...rest} />;
  },
}));

const ensureObjectUrlMocks = () => {
  if (!('createObjectURL' in URL)) {
    Object.defineProperty(URL, 'createObjectURL', {
      writable: true,
      value: vi.fn(() => 'blob:preview'),
    });
  } else {
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:preview');
  }

  if (!('revokeObjectURL' in URL)) {
    Object.defineProperty(URL, 'revokeObjectURL', {
      writable: true,
      value: vi.fn(),
    });
  } else {
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  }
};

const ensureResizeObserver = () => {
  if (typeof global.ResizeObserver === 'undefined') {
    class ResizeObserverPolyfill {
      observe() {}
      unobserve() {}
      disconnect() {}
    }

    // @ts-expect-error: jsdom does not provide ResizeObserver
    global.ResizeObserver = ResizeObserverPolyfill;
  }
};

const createFile = (name: string, type: string) => new File(['test'], name, { type });

const createTransfer = (file: File) => ({
  files: [file],
  items: [
    {
      kind: 'file',
      type: file.type,
      getAsFile: () => file,
    },
  ],
  types: ['Files'],
});

beforeAll(() => {
  ensureObjectUrlMocks();
  ensureResizeObserver();
});

beforeEach(() => {
  mockUploadDocumentAction.mockResolvedValue({ success: true });
  mockRouter.refresh.mockClear();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('UploadDocumentDialog dropzone behaviour', () => {
  const openDialog = async () => {
    const user = userEvent.setup();
    render(<UploadDocumentDialog />);
    await user.click(screen.getByRole('button', { name: /upload document/i }));
    return user;
  };

  it('displays an image preview after dragging and dropping a file', async () => {
    await openDialog();

    const dropzone = screen.getByTestId('document-dropzone');
    const file = createFile('lease-preview.png', 'image/png');

    fireEvent.drop(dropzone, {
      dataTransfer: createTransfer(file),
    });

    expect(await screen.findByAltText('Preview of lease-preview.png')).toBeInTheDocument();
    expect(screen.getByText('lease-preview.png')).toBeInTheDocument();
  });

  it('displays an image preview when a file is pasted from the clipboard', async () => {
    await openDialog();

    const dropzone = screen.getByTestId('document-dropzone');
    dropzone.focus();
    const file = createFile('insurance-card.jpg', 'image/jpeg');

    fireEvent.paste(dropzone, {
      clipboardData: createTransfer(file),
    });

    expect(await screen.findByAltText('Preview of insurance-card.jpg')).toBeInTheDocument();
    expect(screen.getByText('insurance-card.jpg')).toBeInTheDocument();
  });
});
