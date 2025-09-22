
import React from "react";
import CreateForm from "./components/CreateForm";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const STATIC_TODOS = [
        {
                title: "Subscribe",
                created_by: "091832901830",
                id: "101981908",
                completed: false,
        },
];

export default function Todo() {

	return (
		<div className="flex h-screen items-center justify-center">
			<div className="w-96 space-y-5">

				<CreateForm />

                                {STATIC_TODOS.map((todo) => {
                                        return (
                                                <div key={todo.id} className="flex items-center gap-6">
							<h1
								className={cn({
									"line-through": todo.completed,
								})}
							>
								{todo.title}
							</h1>

							<Button>delete</Button>
							<Button>Update</Button>
						</div>
					);
				})}
			</div>
		</div>
	);
}
