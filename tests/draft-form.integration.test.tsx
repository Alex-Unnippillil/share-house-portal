import React from "react"
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react"
import { useForm } from "react-hook-form"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"

import { useDraftForm } from "@/hooks/useDraftForm"
import { useToast } from "@/components/ui/use-toast"

const toastSpy = vi.fn()

vi.mock("next/navigation", () => ({
  usePathname: () => "/test-route",
}))

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: null, loading: false }),
}))

vi.mock("@/utils/supabase-browser", () => ({
  createClient: () => ({
    from: vi.fn(),
    auth: { getUser: vi.fn() },
  }),
}))

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: toastSpy }),
}))

type HarnessFormValues = {
  title: string
  notes: string
}

function DraftFormHarness({ onSubmit }: { onSubmit?: (values: HarnessFormValues) => void }) {
  const form = useForm<HarnessFormValues>({
    defaultValues: { title: "", notes: "" },
  })

  const { toast } = useToast()
  const { clearDraft } = useDraftForm<HarnessFormValues>({
    form,
    values: form.watch(),
    toast,
    storageKey: "test-form",
  })

  const handleSubmit = form.handleSubmit(async (values) => {
    onSubmit?.(values)
    await clearDraft()
    form.reset()
  })

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Title
        <input aria-label="Title" {...form.register("title")} />
      </label>
      <label>
        Notes
        <textarea aria-label="Notes" {...form.register("notes")} />
      </label>
      <button type="submit">Submit</button>
    </form>
  )
}

describe("useDraftForm integration", () => {
beforeEach(() => {
  cleanup()
  toastSpy.mockClear()
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

  it("restores saved drafts after remount", async () => {
    const onSubmit = vi.fn()
    const { getByLabelText, unmount } = render(<DraftFormHarness onSubmit={onSubmit} />)

    const titleField = getByLabelText("Title") as HTMLInputElement
    const notesField = getByLabelText("Notes") as HTMLTextAreaElement

    await act(async () => {})
    vi.useFakeTimers()
    fireEvent.change(titleField, { target: { value: "Draft title" } })
    fireEvent.change(notesField, { target: { value: "Draft notes" } })

    await act(async () => {
      vi.advanceTimersByTime(3500)
    })
    vi.runOnlyPendingTimers()
    await act(async () => {})
    vi.useRealTimers()

    expect(window.localStorage.getItem("draft:anon:test-form")).not.toBeNull()

    unmount()

    const { getByLabelText: getByLabelTextAgain } = render(<DraftFormHarness onSubmit={onSubmit} />)
    await act(async () => {})

    await waitFor(() => {
      const restoredTitle = getByLabelTextAgain("Title") as HTMLInputElement
      const restoredNotes = getByLabelTextAgain("Notes") as HTMLTextAreaElement
      expect(restoredTitle.value).toBe("Draft title")
      expect(restoredNotes.value).toBe("Draft notes")
    })

    expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Restore draft",
      }),
    )
  })

  it("clears draft storage after successful submission", async () => {
    const onSubmit = vi.fn()
    const { getByLabelText, getByText } = render(<DraftFormHarness onSubmit={onSubmit} />)

    const titleField = getByLabelText("Title") as HTMLInputElement
    const notesField = getByLabelText("Notes") as HTMLTextAreaElement

    await act(async () => {})
    vi.useFakeTimers()
    fireEvent.change(titleField, { target: { value: "Submitted draft" } })
    fireEvent.change(notesField, { target: { value: "Should be cleared" } })

    await act(async () => {
      vi.advanceTimersByTime(3500)
    })
    vi.runOnlyPendingTimers()
    await act(async () => {})
    vi.useRealTimers()

    expect(window.localStorage.getItem("draft:anon:test-form")).not.toBeNull()

    await act(async () => {
      fireEvent.click(getByText("Submit"))
    })

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(window.localStorage.getItem("draft:anon:test-form")).toBeNull()
    })
  })
})
