import React from "react";
import ListOfTodo from "./ListOfTodo";
import Table from "@/components/ui/Table";
import { getDashboardTodos } from "../data";

export default async function TodoTable() {
        const tableHeader = ["Title", "Status", "Created at", "Created by"];
        const todos = await getDashboardTodos();

        return (
                <Table headers={tableHeader}>
                        <ListOfTodo todos={todos} />
                </Table>
        );
}