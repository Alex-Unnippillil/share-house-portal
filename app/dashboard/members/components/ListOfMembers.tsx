import { TrashIcon } from "@radix-ui/react-icons"

import {
  dashboardEmptyStateClass,
  dashboardStatusBadgeVariants,
} from "@/app/dashboard/components/dashboard-component-variants"
import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"

import { DashboardMember } from "../data"
import EditMember from "./edit/EditMember"

export default function ListOfMembers({
  members,
}: {
  members: DashboardMember[]
}) {
  if (!members.length) {
    return (
      <tbody>
        <tr>
          <td colSpan={5} className="p-2">
            <div className={dashboardEmptyStateClass}>No members have been added yet.</div>
          </td>
        </tr>
      </tbody>
    )
  }

  return (
    <tbody>
      {members.map((member, index) => {
        const roleTone = member.role === "admin" ? "success" : "warning"
        const statusTone = member.status === "active" ? "success" : "danger"

        return (
          <TableRow key={member.name + index} className={index === 0 ? "bg-muted/40" : undefined}>
            <TableCell className="font-medium text-foreground">{member.name}</TableCell>
            <TableCell>
              <span className={dashboardStatusBadgeVariants({ tone: roleTone })}>{member.role}</span>
            </TableCell>
            <TableCell className="text-muted-foreground">{member.createdAt}</TableCell>
            <TableCell>
              <span className={dashboardStatusBadgeVariants({ tone: statusTone })}>{member.status}</span>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-2">
                <Button size="sm" variant="outline" className="gap-2">
                  <TrashIcon />
                  Delete
                </Button>
                <EditMember />
              </div>
            </TableCell>
          </TableRow>
        )
      })}
    </tbody>
  )
}
