import { Pencil1Icon } from "@radix-ui/react-icons"

import { Button } from "@/components/ui/button"

import DialogForm from "../DialogForm"
import EditForm from "./EditForm"

export default function EditMember() {
  return (
    <DialogForm
      id="update-trigger"
      title="Edit Member"
      Trigger={
        <Button size="sm" variant="outline" className="gap-2">
          <Pencil1Icon />
          Edit
        </Button>
      }
      form={<EditForm />}
    />
  )
}
