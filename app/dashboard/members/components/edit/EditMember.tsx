import React from "react";
import DailogForm from "../DialogForm";
import { Button } from "@/components/ui/button";
import EditForm from "./EditForm";
import { Icon } from "@/components/icons";

export default function EditMember() {
	return (
		<DailogForm
			id="update-trigger"
			title="Edit Member"
			Trigger={
                                <Button variant="outline">
                                        <Icon name="pencil" className="mr-2 size-4" />
                                        Edit
                                </Button>
			}
			form={<EditForm />}
		/>
	);
}