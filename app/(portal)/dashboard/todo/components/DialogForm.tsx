import { ReactNode } from "react"

import { DashboardDialogForm } from "@/app/(portal)/dashboard/components/dashboard-dialog-form"

type DialogFormProps = {
  title: string
  Trigger: ReactNode
  id: string
  form: ReactNode
}

export default function DialogForm({ Trigger, id, title, form }: DialogFormProps) {
  return (
    <DashboardDialogForm
      title={title}
      description="Provide details and save to update your household todo list."
      trigger={Trigger}
      triggerId={id}
      form={form}
    />
  )
}
