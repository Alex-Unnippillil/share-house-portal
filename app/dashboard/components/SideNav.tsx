import NavLinks from "./NavLinks"
import SignOut from "./SignOut"
import { ThemeToggle } from "@/components/theme-toggle"
import type { UserRole } from "@/lib/data/users"

interface SideNavProps {
  role: UserRole
}

export default function SideNav({ role }: SideNavProps) {
  return (
    <div className="hidden flex-1 lg:block">
      <div className="flex size-full flex-col space-y-5 lg:w-96 lg:border-r lg:p-10">
        <div className="flex-1 space-y-5">
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-3xl font-semibold">Roomsily</h1>
              <p className="text-sm text-muted-foreground">www.roomsily household hub</p>
            </div>
            <ThemeToggle />
          </div>
          <NavLinks role={role} />
        </div>
        <div>
          <SignOut />
        </div>
      </div>
    </div>
  )
}
