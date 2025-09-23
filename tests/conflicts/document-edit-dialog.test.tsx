import React, { useState } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import type { DocumentWithLease } from "@/types/documents"
import type { DocumentConflictPayload } from "@/app/documents/actions"

vi.mock("@/app/documents/actions", () => ({
  updateDocumentAction: vi.fn(),
}))

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

import { updateDocumentAction } from "@/app/documents/actions"
import { EditDocumentDialog } from "@/app/documents/components/edit-document-dialog"

const baseDocument: DocumentWithLease = {
  id: "doc-123",
  title: "Lease agreement",
  description: "Original description",
  document_type: "lease",
  status: "draft",
  file_url: "https://example.com/doc.pdf",
  created_at: "2024-05-01T10:00:00.000Z",
  updated_at: "2024-05-02T12:00:00.000Z",
  requires_signature: true,
  version: 2,
  metadata: {},
  created_by: "pm-1",
  documenso_envelope_id: null,
  documenso_template_id: null,
  property_id: null,
  tenant_id: null,
  unit_id: null,
  expires_at: "2024-07-01T00:00:00.000Z",
  signed_at: null,
  parent_document_id: null,
}

function setup() {
  const Wrapper = () => {
    const [open, setOpen] = useState(true)
    return (
      <EditDocumentDialog
        document={baseDocument}
        open={open}
        onOpenChange={setOpen}
      />
    )
  }

  return render(<Wrapper />)
}

function buildConflictPayload(partial?: Partial<DocumentConflictPayload>): DocumentConflictPayload {
  return {
    message: "The document changed.",
    current: {
      ...baseDocument,
      title: "Updated server title",
      description: "Server side description",
      status: "pending_signature",
      requires_signature: false,
      expires_at: "2024-07-15T00:00:00.000Z",
    },
    incoming: {
      title: "Conflicting title",
    },
    latestVersion: 3,
    latestUpdatedAt: "2024-05-03T14:00:00.000Z",
    ...partial,
  }
}

describe("EditDocumentDialog optimistic concurrency", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("surfaces conflicts and applies manual merges", async () => {
    const user = userEvent.setup()
    const updateDocumentActionMock = updateDocumentAction as unknown as vi.Mock

    updateDocumentActionMock.mockResolvedValueOnce({
      success: false,
      status: "conflict",
      conflict: buildConflictPayload(),
    })
    updateDocumentActionMock.mockResolvedValueOnce({
      success: true,
      data: {
        ...baseDocument,
        title: "Merged title",
        description: "Merged description",
        status: "pending_signature",
        requires_signature: false,
        updated_at: "2024-05-03T14:00:00.000Z",
        version: 4,
      },
    })

    setup()

    const titleInput = screen.getByLabelText(/title/i)
    await user.clear(titleInput)
    await user.type(titleInput, "Conflicting title")

    const descriptionInput = screen.getByLabelText(/description/i)
    await user.clear(descriptionInput)
    await user.type(descriptionInput, "Merged description")

    const saveButton = screen.getByRole("button", { name: /save changes/i })
    await user.click(saveButton)

    await screen.findByText(/resolve document conflict/i)

    expect(updateDocumentAction).toHaveBeenCalledTimes(1)

    const manualButton = screen.getByRole("button", { name: /manual merge/i })
    await user.click(manualButton)

    const manualTitle = screen.getAllByLabelText(/title/i)[1]
    await user.clear(manualTitle)
    await user.type(manualTitle, "Merged title")

    const manualConfirm = screen.getByRole("button", { name: /confirm merge/i })
    await user.click(manualConfirm)

    await waitFor(() => expect(updateDocumentAction).toHaveBeenCalledTimes(2))

    const secondCall = updateDocumentActionMock.mock.calls[1][0]
    expect(secondCall.resolution?.type).toBe("manual")
    expect(secondCall.resolution?.mergedFields?.title).toBe("Merged title")
    expect(secondCall.updates.title).toBe("Merged title")

    await waitFor(() => {
      expect(screen.queryByText(/resolve document conflict/i)).not.toBeInTheDocument()
    })
  })
})

