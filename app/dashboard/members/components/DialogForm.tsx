import { ReactNode } from "react"

import { DashboardDialogForm } from "@/app/dashboard/components/dashboard-dialog-form"

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
      trigger={Trigger}
      triggerId={id}
      form={form}
    />
  )
}
