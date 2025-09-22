import React from 'react'

import MemberTable from './components/MemberTable'
import CreateMember from './components/create/CreateMember'

export default function Members() {
  return (
    <div className="space-y-6 px-4 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Member management</h1>
          <p className="text-sm text-muted-foreground">
            Centralise invitations, monitor active roommates, and review account permissions.
          </p>
        </div>
        <CreateMember />
      </div>
      <MemberTable />
    </div>
  )
}
