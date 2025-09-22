import React from "react";
import ListOfMembers from "./ListOfMembers";
import Table from "@/components/ui/Table";

export default function MemberTable() {
	const tableHeader = ["Name", "Role", "Joined", "Status"];

	return (
		<Table headers={tableHeader}>
			<ListOfMembers />
		</Table>
	);
}