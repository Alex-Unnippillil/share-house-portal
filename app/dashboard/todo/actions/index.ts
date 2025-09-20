"use server";

import { revalidatePath } from "next/cache";
import { createSupbaseServerClient } from "@/utils/supaone";
import { z } from "zod";
import type { TablesInsert, TablesUpdate } from "@/lib/supabase";

const createTodoSchema = z.object({
        title: z.string().min(3, { message: "Title must be at least 3 characters long." }),
        task: z.string().min(10, { message: "Task details must be at least 10 characters long." }),
});

const updateTodoSchema = z.object({
        title: z.string().min(3, { message: "Title must be at least 3 characters long." }),
        task: z.string().min(10, { message: "Task details must be at least 10 characters long." }),
        is_complete: z.boolean(),
});

const TODO_PATH = "/dashboard/todo";

export async function createTodo(input: z.infer<typeof createTodoSchema>) {
        const validation = createTodoSchema.safeParse(input);

        if (!validation.success) {
                const message = validation.error.errors.map((err) => err.message).join(" ");
                return { success: false, error: message } as const;
        }

        const supabase = await createSupbaseServerClient();
        const {
                data: { user },
                error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
                return { success: false, error: "You must be logged in to create a task." } as const;
        }

        const { title, task } = validation.data;

        const payload: TablesInsert<"todos"> = {
                title,
                task,
                user_id: user.id,
                created_by: user.id,
                created_at: new Date().toISOString(),
                is_complete: false,
        };

        const { error } = await supabase.from("todos").insert(payload);

        if (error) {
                const message = error.message.includes("todos_created_by_fkey")
                        ? "Unable to save the task because your account is not linked to the members directory. Please contact an administrator."
                        : error.message;
                return { success: false, error: message } as const;
        }

        revalidatePath(TODO_PATH);
        return { success: true } as const;
}

export async function updateTodoById(
        id: number,
        input: z.infer<typeof updateTodoSchema>,
) {
        const validation = updateTodoSchema.safeParse(input);

        if (!validation.success) {
                const message = validation.error.errors.map((err) => err.message).join(" ");
                return { success: false, error: message } as const;
        }

        const supabase = await createSupbaseServerClient();
        const {
                data: { user },
                error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
                return { success: false, error: "You must be logged in to update a task." } as const;
        }

        const payload: TablesUpdate<"todos"> = {
                title: validation.data.title,
                task: validation.data.task,
                is_complete: validation.data.is_complete,
        };

        const { error } = await supabase
                .from("todos")
                .update(payload)
                .eq("id", id)
                .eq("user_id", user.id);

        if (error) {
                return { success: false, error: error.message } as const;
        }

        revalidatePath(TODO_PATH);
        return { success: true } as const;
}

export async function deleteTodoById(id: number) {
        const supabase = await createSupbaseServerClient();
        const {
                data: { user },
                error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
                return { success: false, error: "You must be logged in to delete a task." } as const;
        }

        const { error } = await supabase
                .from("todos")
                .delete()
                .eq("id", id)
                .eq("user_id", user.id);

        if (error) {
                return { success: false, error: error.message } as const;
        }

        revalidatePath(TODO_PATH);
        return { success: true } as const;
}

export async function readTodos() {
        const supabase = await createSupbaseServerClient();
        const {
                data: { user },
                error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
                return { data: [], userId: null, error: "You must be logged in to view tasks." } as const;
        }

        const { data, error } = await supabase
                .from("todos")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

        if (error) {
                return { data: [], userId: user.id, error: error.message } as const;
        }

        return { data: data ?? [], userId: user.id, error: null as string | null } as const;
}
