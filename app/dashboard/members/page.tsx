import React, { Suspense } from "react"

import { isFeatureEnabled } from "@/lib/feature-flags"

import CreateMember from "./components/create/CreateMember"
import MemberTable from "./components/MemberTable"
import { LegacyMemberTable } from "./components/LegacyMemberTable"
import { MemberTableSkeleton } from "./components/skeletons"
import SearchMembers from "./components/SearchMembers"
import { MembersScrollContainer } from "./components/MembersScrollContainer"

export default function Members() {
        const streamingEnabled = isFeatureEnabled("streamingDashboards")

        return (
                <MembersScrollContainer className="w-full space-y-5 overflow-y-auto px-3">
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
                </MembersScrollContainer>
        )
}
