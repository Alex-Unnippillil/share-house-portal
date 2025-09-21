
import React from "react";
import CreateForm from "./components/CreateForm";
import TodoTable from "./components/TodoTable";
import { readTodos } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function Todo() {
        const { data: todos, userId, error } = await readTodos();

        return (
                <div className="flex w-full justify-center">
                        <div className="w-full max-w-4xl space-y-6">
                                <Card>
                                        <CardHeader>
                                                <CardTitle>Create a payment scheduling task</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                                <CreateForm />
                                        </CardContent>
                                </Card>

                                {error && (
                                        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                                                {error}
                                        </div>
                                )}

                                <TodoTable todos={todos} currentUserId={userId ?? undefined} />
                        </div>
                </div>
        );
}
