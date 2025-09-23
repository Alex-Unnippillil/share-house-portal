'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Pencil1Icon } from '@radix-ui/react-icons'

import type { DashboardMember } from '../../data'

import MemberUpdateForm from './MemberUpdateForm'

interface EditMemberProps {
  member: DashboardMember
}

export default function EditMember({ member }: EditMemberProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2" variant="outline">
          <Pencil1Icon />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit member</DialogTitle>
        </DialogHeader>
        <MemberUpdateForm member={member} />
      </DialogContent>
    </Dialog>
  )
}
