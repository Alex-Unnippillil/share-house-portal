import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DefaultEmptyState, FilteredEmptyState } from '@/app/documents/components/documents-empty-state.stories';

describe('DocumentsEmptyState stories', () => {
  it('renders the default empty state with sample templates', () => {
    render(<DefaultEmptyState />);

    expect(screen.getByText('Lease template')).toBeInTheDocument();
    expect(screen.getByText('Roommate addendum')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upload document/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /browse templates/i })).toBeInTheDocument();
  });

  it('highlights filter context and quick actions when filters remove results', () => {
    render(<FilteredEmptyState />);

    expect(screen.getByText(/filters applied/i)).toBeInTheDocument();
    expect(screen.getByText('Status: Pending Signature')).toBeInTheDocument();
    expect(screen.getByText('Type: Lease')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /lease template/i }).length).toBeGreaterThan(0);
  });
});
