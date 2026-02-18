import React, { Suspense } from "react"

import { isFeatureEnabled } from "@/lib/feature-flags"

import CreateMember from "./components/create/CreateMember"
import MemberTable from "./components/MemberTable"
import { LegacyMemberTable } from "./components/LegacyMemberTable"
import { MemberTableSkeleton } from "./components/skeletons"
import SearchMembers from "./components/SearchMembers"

export default function Members() {
        const streamingEnabled = isFeatureEnabled("streamingDashboards")

        return (
                <div className="flex w-full flex-col gap-section">
                        <h1 className="text-3xl font-bold">Members</h1>
                        <div className="flex flex-col gap-2 sm:flex-row">
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
