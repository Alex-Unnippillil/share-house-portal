"use client";
import { Input } from "@/components/ui/input";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
        Form,
        FormControl,
        FormDescription,
        FormField,
        FormItem,
        FormLabel,
        FormMessage,
} from "@/components/ui/form";
import { toast } from "@/components/ui/use-toast";

import { updateTodoById } from "../actions";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Tables } from "@/lib/supabase";

const FormSchema = z.object({
        title: z.string().min(3, {
                message: "Title must be at least 3 characters.",
        }),
        details: z.string().min(10, {
                message: "Add a bit more context to the task.",
        }),
        completed: z.boolean(),
});

type TodoRow = Tables<"todos">;

export default function TodoForm({
        isEdit,
        todo,
        dialogId,
}: {
        isEdit: boolean;
        todo: TodoRow;
        dialogId: string;
}) {
        const [isPending, startTransition] = useTransition();
        const router = useRouter();

        const form = useForm<z.infer<typeof FormSchema>>({
                resolver: zodResolver(FormSchema),
                defaultValues: {
                        title: todo.title ?? "",
                        details: todo.task ?? "",
                        completed: Boolean(todo.is_complete),
                },
        });

        const handleCreateMember = (data: z.infer<typeof FormSchema>) => {
                toast({
                        title: "Unsupported",
                        description: "Creating a task from the edit form is not supported.",
                        variant: "destructive",
                });
        };

        const handleUpdateMember = (data: z.infer<typeof FormSchema>) => {
                startTransition(async () => {
                        const result = await updateTodoById(todo.id, {
                                title: data.title.trim(),
                                task: data.details.trim(),
                                is_complete: data.completed,
                        });

                        if (!result.success) {
                                toast({
                                        title: "Unable to update task",
                                        description: result.error,
                                        variant: "destructive",
                                });
                                return;
                        }

                        toast({
                                title: "Task updated",
                                description: "The payment scheduling step has been updated.",
                        });

                        document.getElementById(dialogId)?.click();
                        router.refresh();
                });
        };

        function onSubmit(data: z.infer<typeof FormSchema>) {
                if (isEdit) {
                        handleUpdateMember(data);
		} else {
			handleCreateMember(data);
		}
	}

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className="w-full space-y-6"
			>
				<FormField
					control={form.control}
					name="title"
					render={({ field }) => (
                                                <FormItem>
                                                        <FormLabel>Title</FormLabel>
                                                        <FormControl>
                                                                <Input
                                                                        placeholder="todo title"
                                                                        type="text"
                                                                        {...field}
                                                                        onChange={field.onChange}
                                                                />
                                                        </FormControl>
                                                        <FormMessage />
                                                </FormItem>
                                        )}
                                />
                                <FormField
                                        control={form.control}
                                        name="details"
                                        render={({ field }) => (
                                                <FormItem>
                                                        <FormLabel>Details</FormLabel>
                                                        <FormControl>
                                                                <Textarea
                                                                        placeholder="Outline the work that needs to happen to schedule the payment"
                                                                        {...field}
                                                                        onChange={field.onChange}
                                                                        rows={4}
                                                                />
                                                        </FormControl>
                                                        <FormDescription>
                                                                Keep the task focused on the next concrete action.
                                                        </FormDescription>
                                                        <FormMessage />
                                                </FormItem>
                                        )}
                                />
                                <FormField
                                        control={form.control}
                                        name="completed"
                                        render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow">
							<FormControl>
								<Checkbox
									checked={field.value}
									onCheckedChange={field.onChange}
								/>
							</FormControl>
							<div className="space-y-1 leading-none">
								<FormLabel>complete</FormLabel>
                                                                </div>
                                                </FormItem>
                                        )}
                                />
                                <Button
                                        type="submit"
                                        className="w-full"
                                        variant="outline"
                                        disabled={isPending}
                                >
                                        {isPending ? "Saving" : "Submit"}
                                </Button>
                        </form>
                </Form>
        );
}