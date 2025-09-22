import React from "react";
import { TrashIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import EditMember from "./edit/EditMember";
import { cn } from "@/lib/utils";

const SAMPLE_MEMBERS = [
        {
                id: "member-admin",
                name: "Admin Member",
                role: "admin",
                created_at: new Date().toDateString(),
                status: "active",
        },
        {
                id: "member-user",
                name: "Non Admin User",
                role: "user",
                created_at: new Date().toDateString(),
                status: "active",
        },
        {
                id: "member-administrator",
                name: "Administrator",
                role: "admin",
                created_at: new Date().toDateString(),
                status: "resigned",
        },
        {
                id: "member-satoshi",
                name: "Satoshi",
                role: "user",
                created_at: new Date().toDateString(),
                status: "active",
        },
];

export default function ListOfMembers() {
        return (
                <div className="mx-2 rounded-sm bg-white dark:bg-inherit">
                        {SAMPLE_MEMBERS.map((member) => {
                                return (
                                        <div
                                                className=" grid grid-cols-5  rounded-sm  p-3 align-middle font-normal"
                                                key={member.id}
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
								<TrashIcon />
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