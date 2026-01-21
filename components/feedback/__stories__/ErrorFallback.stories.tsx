import type { Meta, StoryObj } from "@storybook/react"
import { userEvent, within } from "@storybook/testing-library"

import { ErrorFallback } from "../ErrorBoundary"

const meta = {
  title: "Feedback/ErrorFallback",
  component: ErrorFallback,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  args: {
    onRetry: () => {},
  },
} satisfies Meta<typeof ErrorFallback>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    context: "default",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.tab()
    await userEvent.tab()
    await userEvent.tab()
    await userEvent.keyboard("{Enter}")
    await userEvent.keyboard("{Escape}")
  },
}

export const PaymentsRoute: Story = {
  args: {
    context: "payments",
  },
}

export const DocumentsRoute: Story = {
  args: {
    context: "documents",
  },
}

export const WithDetails: Story = {
  render: (args) => (
    <ErrorFallback {...args} error={new Error("Upstream service timed out")} />
  ),
  args: {
    context: "default",
  },
}
