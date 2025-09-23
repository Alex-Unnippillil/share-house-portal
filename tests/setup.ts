import '@testing-library/jest-dom/vitest';
import React from 'react';
import { vi } from 'vitest';

// Provide React on the global scope so components using the classic runtime
// can mount correctly in tests without importing React explicitly.
// @ts-expect-error - assign for test runtime compatibility
globalThis.React = React;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

const trackMock = vi.fn();
vi.mock('@vercel/analytics/react', () => ({
  track: trackMock,
}));

vi.mock('@/hooks/use-document-permissions', () => ({
  useDocumentPermissions: () => ({
    isTenant: false,
    isRoommate: false,
    isPropertyManager: true,
    isAdmin: true,
    canUploadDocuments: true,
    canCreateSigningRequests: true,
    canViewDocument: () => true,
    canSignDocument: () => true,
    canEditDocument: () => true,
  }),
}));

const toastMock = {
  success: vi.fn(),
  error: vi.fn(),
};

vi.mock('sonner', () => ({
  toast: toastMock,
}));

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!globalThis.ResizeObserver) {
  // @ts-expect-error - assign polyfill for tests
  globalThis.ResizeObserver = ResizeObserver;
}

if (!window.matchMedia) {
  // @ts-expect-error - jsdom stub
  window.matchMedia = () => ({
    matches: false,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
