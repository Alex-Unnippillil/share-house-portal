import React, { ReactNode } from "react";
import SideNav from "./components/SideNav";
import ToggleSidebar from "./components/ToggleSidebar";
import MobileSideNav from "./components/MobileSideNav";
import { readUserSession } from "@/utils/actions";
import { redirect } from "next/navigation";
import { fetchCurrentUserRole } from "@/lib/data/users";

export default async function Layout({ children }: { children: ReactNode }) {
        const { data: userSession } = await readUserSession();

        if (!userSession.session) {
                return redirect("/auth");
        }

        const role = await fetchCurrentUserRole();

        return (
                <div className="flex w-full ">
                        <div className="flex h-screen flex-col">
                                <SideNav role={role} />
                                <MobileSideNav role={role} />
                        </div>

                        <div className="w-full space-y-5 bg-gray-100 p-5 sm:flex-1 sm:p-10 dark:bg-inherit">
                                <ToggleSidebar />
                                {children}
                        </div>
                </div>
        );
}