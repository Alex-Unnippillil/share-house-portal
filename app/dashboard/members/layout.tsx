import type { ReactNode } from "react"

import Breadcrumbs from "@/components/navigation/Breadcrumbs"

export default function MembersLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="px-3 pb-4">
        <Breadcrumbs />
      </div>
      {children}
    </>
  )
}
