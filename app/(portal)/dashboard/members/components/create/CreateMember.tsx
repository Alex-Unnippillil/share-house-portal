import { Button } from "@/components/ui/button"

import DialogForm from "../DialogForm"
import CreateForm from "./CreateForm"

export default function CreateMember() {
  return (
    <DialogForm
      id="create-trigger"
      title="Create Member"
      Trigger={<Button variant="outline">Create member</Button>}
      form={<CreateForm />}
    />
  )
}
