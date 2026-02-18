import React, { Suspense } from "react"

import { isFeatureEnabled } from "@/lib/feature-flags"

import { LegacyMemberTable } from "./components/LegacyMemberTable"
import MemberTable from "./components/MemberTable"
import SearchMembers from "./components/SearchMembers"
import CreateMember from "./components/create/CreateMember"
import { MemberTableSkeleton } from "./components/skeletons"

export default function Members() {
  const streamingEnabled = isFeatureEnabled("streamingDashboards")

  return (
    <div className="w-full space-y-5 overflow-y-auto px-3">
      <h1 className="text-3xl font-bold">Members</h1>
      <div className="flex gap-2">
        <SearchMembers />
        <CreateMember />
      </div>
      {streamingEnabled ? (
        <Suspense fallback={<MemberTableSkeleton />}>
          <MemberTable />
        </Suspense>
      ) : (
        <LegacyMemberTable />
      )}
    </div>
  )
}
