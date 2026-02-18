import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"

import NavLinks from "./NavLinks"
import SignOut from "./SignOut"

export default function SideNav() {
  return <SideBar className="dark:bg-gradient-dark hidden flex-1 lg:block" />
}

export function SideBar({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div
        className={cn(
          "flex size-full flex-col gap-stack-lg lg:w-96 lg:border-r lg:p-content-gutter"
        )}
      >
        <div className="flex-1 space-y-stack-lg">
          <div className="flex flex-1 items-center gap-2">
            <div>
              <h1 className="text-3xl font-semibold">Roomsily</h1>
              <p className="text-body-sm text-muted-foreground">
                www.roomsily household hub
              </p>
            </div>

            <ThemeToggle />
          </div>
          <NavLinks />
        </div>
        <SignOut />
      </div>
    </div>
  )
}
