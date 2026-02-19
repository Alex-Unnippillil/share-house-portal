import { AiOutlineLoading3Quarters } from "react-icons/ai"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type DashboardSubmitButtonProps = {
  label: string
  pending?: boolean
}

export function DashboardSubmitButton({ label, pending = false }: DashboardSubmitButtonProps) {
  return (
    <Button type="submit" className="flex w-full items-center gap-2" variant="outline">
      {label}
      <AiOutlineLoading3Quarters className={cn("animate-spin", { hidden: !pending })} />
    </Button>
  )
}
