// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock)

vi.mock("@/app/dashboard/members/components/edit/EditMember", () => ({
  default: () => <button type="button">Edit</button>,
}))

vi.mock("@/app/dashboard/todo/actions", () => ({
  createTodo: vi.fn(),
  updateTodoById: vi.fn(),
}))

vi.mock("@/components/ui/use-toast", () => ({
  toast: vi.fn(),
}))

import ListOfMembers from "@/app/dashboard/members/components/ListOfMembers"
import TodoForm from "@/app/dashboard/todo/components/TodoForm"

describe("dashboard members/todo visual states", () => {
  it("marks the first member row as active and styles status badges", () => {
    render(
      <table>
        <ListOfMembers
          members={[
            {
              name: "Admin",
              role: "admin",
              createdAt: "Today",
              status: "active",
            },
            {
              name: "Former",
              role: "tenant",
              createdAt: "Yesterday",
              status: "resigned",
            },
          ]}
        />
      </table>,
    )

    const activeRow = screen.getByText("Admin").closest("tr")
    expect(activeRow).toHaveClass("bg-muted/40")

    expect(screen.getByText("active").className).toContain("text-emerald")
    expect(screen.getByText("resigned").className).toContain("text-red")
  })

  it("renders an empty state when members list is empty", () => {
    render(
      <table>
        <ListOfMembers members={[]} />
      </table>,
    )

    expect(screen.getByText("No members have been added yet.")).toBeInTheDocument()
  })

  it("shows form validation error for short todo title", async () => {
    const user = userEvent.setup()
    render(<TodoForm isEdit={false} />)

    await user.type(screen.getByLabelText("Title"), "short")
    await user.click(screen.getByRole("button", { name: /submit/i }))

    expect(await screen.findByText("Title must be at least 10 characters.")).toBeInTheDocument()
  })
})
