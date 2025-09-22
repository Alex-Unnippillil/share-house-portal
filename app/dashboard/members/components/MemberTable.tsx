import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Table from "@/components/ui/Table"
import type { MemberRecord } from "@/lib/data/members"
import { cn } from "@/lib/utils"
import { TrashIcon } from "@radix-ui/react-icons"
import EditMember from "./edit/EditMember"

interface MemberTableProps {
  members: MemberRecord[]
  searchQuery?: string
}

function formatDate(dateString: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }).format(new Date(dateString))
  } catch (error) {
    return dateString
  }
}

export default function MemberTable({ members, searchQuery }: MemberTableProps) {
  const tableHeader = ["Name", "Role", "Joined", "Status", "Actions"]

  return (
    <Table headers={tableHeader}>
      <div className="mx-2 rounded-sm bg-white dark:bg-inherit">
        {members.length > 0 ? (
          members.map((member) => (
            <div
              className="grid grid-cols-5 rounded-sm p-3 align-middle font-normal"
              key={member.id}
            >
              <h1>{member.name}</h1>

              <div>
                <span
                  className={cn(
                    "rounded-full border-[0.5px] px-3 py-1 text-sm capitalize shadow dark:bg-zinc-800",
                    {
                      "border-green-500 bg-green-200 text-green-600": member.role === "admin",
                      "border-blue-400 bg-blue-100 text-blue-600": member.role === "property_manager",
                      "border-zinc-300 bg-yellow-50 px-4 text-yellow-700 dark:border-yellow-700 dark:text-yellow-300":
                        member.role === "user" || member.role === "roommate",
                    },
                  )}
                >
                  {member.role.replace("_", " ")}
                </span>
              </div>

              <h1>{formatDate(member.joinedAt)}</h1>

              <Badge
                className={cn("w-fit capitalize", {
                  "bg-green-200 text-green-700 hover:bg-green-200": member.status === "active",
                  "bg-red-100 text-red-500 hover:bg-red-100": member.status === "resigned",
                  "bg-sky-100 text-sky-700 hover:bg-sky-100": member.status === "invited",
                })}
                variant="outline"
              >
                {member.status}
              </Badge>

              <div className="flex items-center gap-2">
                <Button variant="outline">
                  <TrashIcon />
                  Delete
                </Button>
                <EditMember />
              </div>
            </div>
          ))
        ) : (
          <div className="p-6 text-sm text-muted-foreground">
            {searchQuery?.trim()
              ? `No members found for "${searchQuery.trim()}".`
              : "No members match the current filters."}
          </div>
        )}
      </div>
    </Table>
  )
}
