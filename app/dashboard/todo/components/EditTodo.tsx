import React from "react";
import DailogForm from "./DialogForm";
import { Button } from "@/components/ui/button";
import MemberForm from "./TodoForm";
import { Icon } from "@/components/icons";

export default function EditTodo() {
	return (
		<DailogForm
			id="update-trigger"
			title="Edit Todo"
			Trigger={
                                <Button variant="outline">
                                        <Icon name="pencil" className="mr-2 size-4" />
                                        Edit
                                </Button>
			}
			form={<MemberForm isEdit={true} />}
		/>
	);
}