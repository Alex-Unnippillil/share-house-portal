import { MemberTableSkeleton } from "./components/skeletons"

export default function LoadingMembers() {
  return (
    <div className="w-full space-y-5 overflow-y-auto px-3">
      <div className="h-10 w-40 animate-pulse rounded bg-muted/60" />
      <MemberTableSkeleton />
    </div>
  )
}
