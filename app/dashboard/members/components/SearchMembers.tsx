import { Input } from "@/components/ui/input";
import React from "react";

export default function SearchMembers() {
	return (
		<Input
			placeholder="search by role, name"
			className="bg-background ring-border focus:ring-ring"
		/>
	);
}