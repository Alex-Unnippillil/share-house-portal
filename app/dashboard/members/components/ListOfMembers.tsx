import React from "react";
import { Button } from "@/components/ui/button";
import EditMember from "./edit/EditMember";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/icons";

export default function ListOfMembers() {
	const members = [
		{
			name: "Admin Member",
			role: "admin",
			created_at: new Date().toDateString(),
			status: "active",
		},
		{
			name: "Non Admin User",
			role: "user",
			created_at: new Date().toDateString(),
			status: "active",
		},
		{
			name: "Administrator",
			role: "admin",
			created_at: new Date().toDateString(),
			status: "resigned",
		},
		{
			name: "Satoshi",
			role: "user",
			created_at: new Date().toDateString(),
			status: "active",
		},
	];
	return (
		<div className="mx-2 rounded-sm bg-white dark:bg-inherit">
			{members.map((member, index) => {
				return (
					<div
						className=" grid grid-cols-5  rounded-sm  p-3 align-middle font-normal"
						key={index}
					>
						<h1>{member.name}</h1>

						<div>
							<span
								className={cn(
									" rounded-full border-[.5px] px-2 py-1 text-sm capitalize  shadow dark:bg-zinc-800",
									{
										"border-green-500 text-green-600 bg-green-200":
											member.role === "admin",
										"border-zinc-300 dark:text-yellow-300 dark:border-yellow-700 px-4 bg-yellow-50":
											member.role === "user",
									}
								)}
							>
								{member.role}
							</span>
						</div>
						<h1>{member.created_at}</h1>
						<div>
							<span
								className={cn(
									" rounded-full border border-zinc-300 px-2  py-1 text-sm capitalize  dark:bg-zinc-800",
									{
										"text-green-600 px-4 dark:border-green-400 bg-green-200":
											member.status === "active",
										"text-red-500 bg-red-100 dark:text-red-300 dark:border-red-400":
											member.status === "resigned",
									}
								)}
							>
								{member.status}
							</span>
						</div>

						<div className="flex items-center gap-2">
                                                        <Button variant="outline">
                                                                <Icon name="trash-2" className="mr-2 size-4" />
                                                                Delete
                                                        </Button>
							<EditMember />
						</div>
					</div>
				);
			})}
		</div>
	);
}