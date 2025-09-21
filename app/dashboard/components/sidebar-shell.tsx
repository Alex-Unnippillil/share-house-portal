"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import SignOut from "./SignOut";
import NavLinks from "./NavLinks";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/config/rbac";
import { ROLE_LABELS } from "@/config/rbac";

export type SidebarShellProps = {
        role: AppRole;
        className?: string;
        onNavigate?: () => void;
};

export function SidebarShell({ role, className, onNavigate }: SidebarShellProps) {
        return (
                <div
                        className={cn(
                                "flex size-full flex-col justify-between space-y-6 px-6 py-8",
                                className
                        )}
                >
                        <div className="space-y-6">
                                <div className="flex items-start justify-between gap-2">
                                        <div>
                                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                        Onyx Control Center
                                                </p>
                                                <h1 className="text-2xl font-bold leading-tight">House Dashboard</h1>
                                                <p className="text-xs text-muted-foreground">
                                                        {ROLE_LABELS[role]} workspace
                                                </p>
                                        </div>
                                        <ThemeToggle />
                                </div>
                                <NavLinks role={role} onNavigate={onNavigate} />
                        </div>
                        <SignOut />
                </div>
        );
}
