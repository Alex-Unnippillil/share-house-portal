import { ReactNode } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type DashboardDialogFormProps = {
  title: string
  description?: string
  trigger: ReactNode
  triggerId: string
  form: ReactNode
}

export function DashboardDialogForm({
  title,
  description,
  trigger,
  triggerId,
  form,
}: DashboardDialogFormProps) {
  return (
    <Dialog>
      <DialogTrigger asChild id={triggerId}>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {form}
      </DialogContent>
    </Dialog>
  )
}
