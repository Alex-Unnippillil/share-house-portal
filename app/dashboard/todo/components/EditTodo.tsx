import React from "react";
import DailogForm from "./DialogForm";
import { Button } from "@/components/ui/button";
import { Pencil1Icon } from "@radix-ui/react-icons";
import MemberForm from "./TodoForm";
import type { Tables } from "@/lib/supabase";

type TodoRow = Tables<"todos">;

export default function EditTodo({ todo }: { todo: TodoRow }) {
        const dialogId = `update-trigger-${todo.id}`;

        return (
                <DailogForm
                        id={dialogId}
                        title="Edit Todo"
                        Trigger={
                                <Button variant="outline">
                                        <Pencil1Icon />
                                        Edit
                                </Button>
                        }
                        form={<MemberForm isEdit={true} todo={todo} dialogId={dialogId} />}
                />
        );
}