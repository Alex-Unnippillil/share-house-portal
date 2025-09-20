import React from "react";
import ListOfTodo from "./ListOfTodo";
import Table from "@/components/ui/Table";
import type { Tables } from "@/lib/supabase";

type TodoRow = Tables<"todos">;

export default function TodoTable({
        todos,
        currentUserId,
}: {
        todos: TodoRow[];
        currentUserId?: string;
}) {
        const tableHeader = ["Title", "Status", "Created at", "Created by", "Actions"];

        return (
                <Table headers={tableHeader}>
                        <ListOfTodo todos={todos} currentUserId={currentUserId} />
                </Table>
        );
}