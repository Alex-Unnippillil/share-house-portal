
import React from "react";
import CreateForm from "./components/CreateForm";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { readUserProfile } from "@/utils/actions";
import { getCapabilities, normalizeRole, ROLE_LABELS } from "@/config/rbac";

export default async function Todo() {
        const profile = await readUserProfile();
        const role = normalizeRole(profile?.role ?? undefined);
        const capabilities = getCapabilities(role);
        const todos = [
                {
                        title: "Subscribe",
                        created_by: "091832901830",
                        id: "101981908",
			completed: false,
		},
	];

	return (
                <div className="flex h-screen items-center justify-center">
                        <div className="w-96 space-y-5">

                                <div className="space-y-2 text-center">
                                        <h1 className="text-2xl font-semibold">Shared Todo board</h1>
                                        <p className="text-xs text-muted-foreground">
                                                {ROLE_LABELS[role]} workspace tasks and chore tracking.
                                        </p>
                                </div>

                                <CreateForm canCreate={capabilities.canManageTodos} />

                                {todos?.map((todo, index) => {
                                        return (
                                                <div key={index} className="flex items-center gap-6">
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
