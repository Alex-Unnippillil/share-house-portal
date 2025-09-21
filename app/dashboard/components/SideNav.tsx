import type { AppRole } from "@/config/rbac";
import { SidebarShell } from "./sidebar-shell";

type SideNavProps = {
        role: AppRole;
};

export default function SideNav({ role }: SideNavProps) {
        return (
                <aside className="hidden lg:block h-full flex-1 lg:max-w-xs border-border">
                        <SidebarShell
                                role={role}
                                className="h-full border-r border-border bg-background dark:bg-gradient-dark"
                        />
                </aside>
        );
}