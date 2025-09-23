"use client"

import { Mail, RefreshCw, LifeBuoy } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { useDashboardTourControls } from "./FirstRunTour"

export default function DashboardHelpMenu() {
  const { reopenTour } = useDashboardTourControls()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          data-tour-id="dashboard-help-menu"
        >
          <LifeBuoy className="size-4" />
          Help
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Help center</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <a
            href="mailto:support@roomsily.com?subject=Dashboard%20help"
            className="flex items-center gap-2"
          >
            <Mail className="size-4" />
            Email support
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            reopenTour()
          }}
          className="flex items-center gap-2"
        >
          <RefreshCw className="size-4" />
          Reopen tour
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
