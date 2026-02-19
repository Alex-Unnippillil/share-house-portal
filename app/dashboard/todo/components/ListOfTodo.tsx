import { TrashIcon } from "@radix-ui/react-icons"

import {
  dashboardEmptyStateClass,
  dashboardStatusBadgeVariants,
  dashboardTableContainerClass,
  dashboardTableRowVariants,
} from "@/app/dashboard/components/dashboard-component-variants"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import EditTodo from "./EditTodo"

type TodoRow = {
  title: string
  status: "completed" | "pending"
  createdAt: string
  createdBy: string
}

const todos: TodoRow[] = [
  {
    title: "Subscribe to my channel",
    status: "completed",
    createdAt: new Date().toDateString(),
    createdBy: "Garfield",
  },
  {
    title: "Prepare parking rules announcement",
    status: "pending",
    createdAt: new Date().toDateString(),
    createdBy: "Trender",
  },
]

export default function ListOfTodo() {
  if (!todos.length) {
    return <div className={dashboardEmptyStateClass}>No todos yet. Create one to get started.</div>
  }

  return (
    <div className={cn(dashboardTableContainerClass, "mx-2")}>
      {todos.map((todo, index) => (
        <div key={todo.title + index} className={dashboardTableRowVariants({ active: index === 0 })}>
          <p className="font-medium text-foreground">{todo.title}</p>
          <div>
            <span
              className={dashboardStatusBadgeVariants({
                tone: todo.status === "completed" ? "success" : "warning",
              })}
            >
              {todo.status}
            </span>
          </div>
          <p className="text-muted-foreground">{todo.createdAt}</p>
          <p className="text-muted-foreground">{todo.createdBy}</p>
          <div className="flex items-center justify-end gap-2">
            <Button size="sm" variant="outline" className="gap-2">
              <TrashIcon />
              Delete
            </Button>
            <EditTodo />
          </div>
        </div>
      ))}
    </div>
  )
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
