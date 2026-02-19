import { TrashIcon } from "@radix-ui/react-icons"

import {
  dashboardEmptyStateClass,
  dashboardStatusBadgeVariants,
  dashboardTableContainerClass,
  dashboardTableRowVariants,
} from "@/app/dashboard/components/dashboard-component-variants"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { DashboardMember } from "../data"
import EditMember from "./edit/EditMember"

export default function ListOfMembers({ members }: { members: DashboardMember[] }) {
  if (!members.length) {
    return <div className={dashboardEmptyStateClass}>No members have been added yet.</div>
  }

  return (
    <div className={cn(dashboardTableContainerClass, "mx-2")}> 
      {members.map((member, index) => {
        const roleTone = member.role === "admin" ? "success" : "warning"
        const statusTone = member.status === "active" ? "success" : "danger"

        return (
          <div
            className={dashboardTableRowVariants({ active: index === 0 })}
            data-active={index === 0}
            key={member.name + index}
          >
            <p className="font-medium text-foreground">{member.name}</p>
            <div>
              <span className={dashboardStatusBadgeVariants({ tone: roleTone })}>{member.role}</span>
            </div>
            <p className="text-muted-foreground">{member.createdAt}</p>
            <div>
              <span className={dashboardStatusBadgeVariants({ tone: statusTone })}>{member.status}</span>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button size="sm" variant="outline" className="gap-2">
                <TrashIcon />
                Delete
              </Button>
              <EditMember />
            </div>
          </div>
        )
      })}
    </div>
  )
}
