import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, beforeEach } from "vitest"
import { ColumnDef } from "@tanstack/react-table"

import Table from "@/components/ui/Table"

type Person = {
  id: number
  name: string
  role: string
}

const columns: ColumnDef<Person>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <span>{row.original.name}</span>,
    size: 220,
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => <span>{row.original.role}</span>,
    size: 180,
  },
]

const data: Person[] = [
  { id: 1, name: "Ada Lovelace", role: "Engineer" },
  { id: 2, name: "Grace Hopper", role: "Rear Admiral" },
]

describe("Table", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("persists column widths between renders", async () => {
    const tableId = "test-table"

    const renderTable = () =>
      render(<Table columns={columns} data={data} tableId={tableId} />)

    const { unmount } = renderTable()

    const resizeHandle = screen.getByTestId("resize-handle-name")

    fireEvent.mouseDown(resizeHandle, { clientX: 200 })
    fireEvent.mouseMove(document, { clientX: 260 })
    fireEvent.mouseUp(document)

    const header = screen.getByRole("columnheader", { name: "Name" })

    await waitFor(() => {
      expect(header.style.width).not.toBe("")
    })

    const widthAfterResize = header.style.width

    await waitFor(() => {
      const stored = window.localStorage.getItem(
        `table-column-sizing:${tableId}`,
      )
      expect(stored).toBeTruthy()
    })

    unmount()

    renderTable()

    const restoredHeader = await screen.findByRole("columnheader", {
      name: "Name",
    })

    await waitFor(() => {
      expect(restoredHeader.style.width).toBe(widthAfterResize)
    })
  })

  it("applies sticky header styles", () => {
    const { container } = render(
      <Table columns={columns} data={data} tableId="sticky-test" />,
    )

    const header = container.querySelector("thead")

    expect(header).not.toBeNull()
    expect(header).toHaveClass("sticky")
    expect(header).toHaveClass("top-0")
  })
})
