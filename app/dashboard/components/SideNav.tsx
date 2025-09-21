import React from "react";
import NavLinks from "./NavLinks";

import { cn } from "@/lib/utils";
import SignOut from "./SignOut";
import { ThemeToggle } from "@/components/theme-toggle";
import type { BuildingRole } from "@/types/auth";

type SideNavProps = {
  activeRole: BuildingRole | null;
};

export default function SideNav({ activeRole }: SideNavProps) {
  return (
    <SideBar
      className="dark:bg-gradient-dark hidden flex-1 lg:block"
      activeRole={activeRole}
    />
  );
}

export const SideBar = ({
  className,
  activeRole,
}: {
  className?: string;
  activeRole: BuildingRole | null;
}) => {
  return (
    <div className={className}>
      <div
        className={cn(
          "flex size-full flex-col space-y-5 lg:w-96 lg:border-r lg:p-10 "
        )}
      >
        <div className="flex-1 space-y-5">
          <div className="flex flex-1 items-center gap-2">
            <h1 className="text-3xl font-bold">Onyx Dash</h1>

            <ThemeToggle />
          </div>
          <NavLinks activeRole={activeRole} />
        </div>
        <div>
          <SignOut />
        </div>
      </div>
    </div>
  );
};
