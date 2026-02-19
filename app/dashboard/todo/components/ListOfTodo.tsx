import React from "react";
import { TrashIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import EditTodo from "./EditTodo";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function ListOfTodo() {
	const todos = [
		{
			title: "Subscribe to my channel",
			status: "completed",
			created_at: new Date().toDateString(),
			create_by: "Garfield",
		},
		{
			title: "Subscribe to my channel",
			status: "completed",
			created_at: new Date().toDateString(),
			create_by: "Trender",
		},
		{
			title: "Subscribe to my channel",
			status: "completed",
			created_at: new Date().toDateString(),
			create_by: "Some string",
		},
	];
	return (
		<div className="mx-2 rounded-sm bg-white dark:bg-inherit">
			{todos.map((todo, index) => {
				return (
					<div
						className=" grid grid-cols-5  rounded-sm  p-3 align-middle font-normal "
						key={index}
					>
						{Object.keys(todo).map((key, index) => {
							if (key === "status") {
								return (
									<div
										key={index}
										className="flex items-center"
									>
										<div>
											<span
												className={cn(
													"  rounded-full border-[.5px] px-2 py-1 text-sm capitalize  shadow bg-muted",
													{
														"border-payment-paid-border bg-payment-paid text-payment-paid-background":
															todo.status ===
															"completed",
													}
												)}
											>
												{todo.status}
											</span>
										</div>
									</div>
								);
							} else {
								return (
									<h1
									className="flex items-center text-lg text-foreground"
									key={index}
								>
										{todo[key as keyof typeof todo]}
									</h1>
								);
							}
						})}

						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								className="bg-background"
							>
								<TrashIcon />
								delete
							</Button>
							<EditTodo />
						</div>
					</div>
				);
			})}
		</div>
	);
}
