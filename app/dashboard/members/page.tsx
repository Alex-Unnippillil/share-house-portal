import React from "react";
import MemberTable from "./components/MemberTable";
import SearchMembers from "./components/SearchMembers";
import CreateMember from "./components/create/CreateMember";
import { BulkAdminActions } from "./components/BulkAdminActions";
import { listRecentAdminJobs } from "./actions/admin-jobs";

export default async function Members() {
        const jobs = await listRecentAdminJobs();

        return (
                <div className="w-full space-y-6 overflow-y-auto px-3 pb-10">
                        <h1 className="text-3xl font-bold">Members</h1>
                        <p className="text-sm text-muted-foreground">
                                Manage individual members or schedule large updates with the admin
                                queue.
                        </p>
                        <div className="flex flex-wrap gap-2">
                                <SearchMembers />
                                <CreateMember />
                        </div>
                        <BulkAdminActions initialJobs={jobs} />
                        <MemberTable />
                </div>
        );
}