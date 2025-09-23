import React, { Suspense } from "react"

import { isFeatureEnabled } from "@/lib/feature-flags"

import CreateMember from "./components/create/CreateMember"
import MemberTable from "./components/MemberTable"
import { LegacyMemberTable } from "./components/LegacyMemberTable"
import { MemberTableSkeleton } from "./components/skeletons"
import SearchMembers from "./components/SearchMembers"
import { CSVImportDialog } from "@/components/import/CSVImportDialog"

export default function Members() {
        const streamingEnabled = isFeatureEnabled("streamingDashboards")

        return (
                <div className="w-full space-y-5 overflow-y-auto px-3">
                        <h1 className="text-3xl font-bold">Members</h1>
                        <div className="flex flex-wrap gap-2">
                                <SearchMembers />
                                <CreateMember />
                                <CSVImportDialog entity="members" triggerLabel="Import CSV" />
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
