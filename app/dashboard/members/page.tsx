import React from "react";
import MemberTable from "./components/MemberTable";
import SearchMembers from "./components/SearchMembers";
import CreateMember from "./components/create/CreateMember";
import { readUserProfile } from "@/utils/actions";
import { getCapabilities, normalizeRole, ROLE_LABELS } from "@/config/rbac";

export default async function Members() {
        const profile = await readUserProfile();
        const role = normalizeRole(profile?.role ?? undefined);
        const capabilities = getCapabilities(role);

        if (!capabilities.canManageMembers) {
                return (
                        <div className="w-full space-y-5 overflow-y-auto px-3 py-10">
                                <h1 className="text-3xl font-bold">Members</h1>
                                <p className="max-w-xl text-sm text-muted-foreground">
                                        The {ROLE_LABELS[role]} role does not include access to manage resident records. Please
                                        contact a house manager if you need changes made to the roster.
                                </p>
                        </div>
                );
        }

        return (
                <div className="w-full space-y-5 overflow-y-auto px-3">
                        <h1 className="text-3xl font-bold">Members</h1>
                        <div className="flex gap-2">
                                <SearchMembers />
                                <CreateMember />
                        </div>
                        <MemberTable />
                </div>
        );
}