import React from "react";
import { TrashIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import EditMember from "./edit/EditMember";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/config/rbac";

type MemberRole = "resident" | "house_manager" | "platform_admin";

export default function ListOfMembers() {
        const members: Array<{
                name: string;
                role: MemberRole;
                created_at: string;
                status: "active" | "resigned";
        }> = [
                {
                        name: "Amelia Walters",
                        role: "house_manager",
                        created_at: new Date("2023-12-01").toDateString(),
                        status: "active",
                },
                {
                        name: "Diego Ramirez",
                        role: "resident",
                        created_at: new Date("2024-02-18").toDateString(),
                        status: "active",
                },
                {
                        name: "Lina Martins",
                        role: "platform_admin",
                        created_at: new Date("2022-09-10").toDateString(),
                        status: "active",
                },
                {
                        name: "Haruto Sato",
                        role: "resident",
                        created_at: new Date("2023-07-05").toDateString(),
                        status: "resigned",
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
                                                        <Badge
                                                                variant={
                                                                        member.role === "platform_admin"
                                                                                ? "default"
                                                                                : member.role === "house_manager"
                                                                                ? "secondary"
                                                                                : "outline"
                                                                }
                                                                className="capitalize"
                                                        >
                                                                {ROLE_LABELS[member.role]}
                                                        </Badge>
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