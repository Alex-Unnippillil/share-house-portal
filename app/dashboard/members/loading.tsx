import { Skeleton } from "@/components/ui/skeleton"

import { MemberTableSkeleton } from "./components/skeletons"

export default function LoadingMembers() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-40 rounded-lg" />
      <MemberTableSkeleton />
    </div>
  )
}
