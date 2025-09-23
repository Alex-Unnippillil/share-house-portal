import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { EditableTextCell } from '@/components/editable/editable-text-cell'

describe('EditableTextCell', () => {
  it('persists edits after successful save', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockImplementation(async (value: string) => ({
      success: true,
      data: { value },
    }))

    const { getByRole, getByTestId, queryByTestId } = render(
      <EditableTextCell
        id="document-title"
        label="Document title"
        value="Initial title"
        onSave={onSave}
        required
      />
    )

    await user.click(getByRole('button', { name: /edit document title/i }))
    const input = getByRole('textbox', { name: /document title/i })
    expect(input).toHaveValue('Initial title')

    await user.clear(input)
    await user.type(input, 'Updated title')
    await user.click(getByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('Updated title'))
    await waitFor(() =>
      expect(getByTestId('document-title-value')).toHaveTextContent('Updated title')
    )
    expect(queryByTestId('document-title-editor')).not.toBeInTheDocument()
  })

  it('shows inline validation errors when the field is required', async () => {
    const user = userEvent.setup()

    const { getByRole, findByRole } = render(
      <EditableTextCell
        id="document-title"
        label="Document title"
        value="Initial title"
        onSave={vi.fn().mockResolvedValue({ success: true })}
        required
      />
    )

    await user.click(getByRole('button', { name: /edit document title/i }))
    const input = getByRole('textbox', { name: /document title/i })
    await user.clear(input)
    await user.click(getByRole('button', { name: /^save$/i }))

    expect(await findByRole('alert')).toHaveTextContent('This field is required.')
  })

  it('manages focus for accessibility when editing and saving', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue({ success: true })

    const { getByRole } = render(
      <EditableTextCell
        id="document-title"
        label="Document title"
        value="Initial title"
        onSave={onSave}
        required
      />
    )

    await user.click(getByRole('button', { name: /edit document title/i }))

    const input = getByRole('textbox', { name: /document title/i })
    expect(input).toHaveFocus()

    await user.type(input, ' updated')
    await user.click(getByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    await waitFor(() =>
      expect(getByRole('button', { name: /edit document title/i })).toHaveFocus()
    )
  })
})
