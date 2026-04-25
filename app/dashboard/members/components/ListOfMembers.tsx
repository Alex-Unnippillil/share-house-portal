"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Pencil1Icon, TrashIcon } from "@radix-ui/react-icons"

import {
  dashboardEmptyStateClass,
  dashboardStatusBadgeVariants,
} from "@/app/dashboard/components/dashboard-component-variants"
import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"

import { deleteMemberById, updateMemberById } from "../actions"
import { DashboardMember } from "../data"

export default function ListOfMembers({
  members,
}: {
  members: DashboardMember[]
}) {
  const router = useRouter()
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

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

  const onDelete = (member: DashboardMember) => {
    setActiveMemberId(member.id)

    startTransition(async () => {
      const result = await deleteMemberById(member.id)

      if (!result.ok) {
        toast({
          variant: "destructive",
          title: "Could not delete member",
          description: result.message,
        })
        setActiveMemberId(null)
        return
      }

      toast({
        title: "Member deleted",
        description: `${member.name} was deleted successfully.`,
      })

      router.refresh()
      setActiveMemberId(null)
    })
  }

  const onEdit = (member: DashboardMember) => {
    setActiveMemberId(member.id)

    const nextStatus = member.status === "active" ? "resigned" : "active"

    startTransition(async () => {
      const result = await updateMemberById(member.id, { status: nextStatus })

      if (!result.ok) {
        toast({
          variant: "destructive",
          title: "Could not update member",
          description: result.message,
        })
        setActiveMemberId(null)
        return
      }

      toast({
        title: "Member updated",
        description: `${member.name} is now marked ${nextStatus}.`,
      })

      router.refresh()
      setActiveMemberId(null)
    })
  }

  return (
    <tbody>
      {members.map((member, index) => {
        const roleTone = member.role === "admin" ? "success" : "warning"
        const statusTone = member.status === "active" ? "success" : "danger"
        const memberIsBusy = isPending && activeMemberId === member.id

        return (
          <TableRow key={member.id ?? member.name + index} className={index === 0 ? "bg-muted/40" : undefined}>
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
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => onDelete(member)}
                  disabled={memberIsBusy}
                >
                  <TrashIcon />
                  Delete
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => onEdit(member)}
                  disabled={memberIsBusy}
                >
                  <Pencil1Icon />
                  Edit
                </Button>
              </div>
            </TableCell>
          </TableRow>
        )
      })}
    </tbody>
  )
}
