import React from "react";
import { TrashIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import EditTodo from "./EditTodo";
import { cn } from "@/lib/utils";

const SAMPLE_TODO_ROWS = [
        {
                id: "todo-garfield",
                title: "Subscribe to my channel",
                status: "completed",
                created_at: new Date().toDateString(),
                create_by: "Garfield",
        },
        {
                id: "todo-trender",
                title: "Subscribe to my channel",
                status: "completed",
                created_at: new Date().toDateString(),
                create_by: "Trender",
        },
        {
                id: "todo-string",
                title: "Subscribe to my channel",
                status: "completed",
                created_at: new Date().toDateString(),
                create_by: "Some string",
        },
];

export default function ListOfTodo() {
        return (
                <div className="mx-2 rounded-sm bg-white dark:bg-inherit">
                        {SAMPLE_TODO_ROWS.map((todo) => {
                                return (
                                        <div
                                                className=" grid grid-cols-5  rounded-sm  p-3 align-middle font-normal "
                                                key={todo.id}
                                        >
                                                <h1 className="flex items-center text-lg dark:text-white">
                                                        {todo.title}
                                                </h1>
                                                <div className="flex items-center">
                                                        <div>
                                                                <span
                                                                        className={cn(
                                                                                "  rounded-full border-[.5px] px-2 py-1 text-sm capitalize  shadow dark:bg-zinc-800",
                                                                                {
                                                                                        "border-green-500 bg-green-400 dark:text-green-400":
                                                                                                todo.status === "completed",
                                                                                }
                                                                        )}
                                                                >
                                                                        {todo.status}
                                                                </span>
                                                        </div>
                                                </div>
                                                <h1 className="flex items-center text-lg dark:text-white">
                                                        {todo.created_at}
                                                </h1>
                                                <h1 className="flex items-center text-lg dark:text-white">
                                                        {todo.create_by}
                                                </h1>

                                                <div className="flex items-center gap-2">
                                                        <Button
								variant="outline"
								className="bg-dark dark:bg-inherit"
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