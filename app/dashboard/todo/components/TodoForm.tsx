"use client";
import { Input } from "@/components/ui/input";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
        Form,
        FormControl,
        FormField,
        FormItem,
        FormLabel,
        FormMessage,
} from "@/components/ui/form";
import { toast } from "@/components/ui/use-toast";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useTodoMutations } from "@/hooks/mutations/use-todo-mutations";

const FormSchema = z.object({
	title: z.string().min(10, {
		message: "Title must be at least 10 characters.",
	}),
	completed: z.boolean(),
});

export default function TodoForm({ isEdit }: { isEdit: boolean }) {
        const { createMutation, updateMutation } = useTodoMutations();
        const form = useForm<z.infer<typeof FormSchema>>({
                resolver: zodResolver(FormSchema),
                defaultValues: {
                        title: "",
                        completed: false,
                },
        });

        const isProcessing = isEdit ? updateMutation.isMutating : createMutation.isMutating;
        const queuedCount = createMutation.pendingCount + updateMutation.pendingCount;

        const handleCreateMember = async (data: z.infer<typeof FormSchema>) => {
                const result = await createMutation.mutate({ todo: data });

                if (result.status === "synced") {
                        toast({
                                title: "Todo saved",
                                description: "Your todo item has been created.",
                        });
                        form.reset();
                        document.getElementById("create-trigger")?.click();
                        return;
                }

                if (result.status === "queued") {
                        toast({
                                title: "Offline - todo queued",
                                description: "We'll sync this todo once you're back online.",
                        });
                        form.reset();
                        document.getElementById("create-trigger")?.click();
                        return;
                }

                if (result.status === "conflict") {
                        toast({
                                title: "Todo conflict",
                                description: result.error.message,
                                variant: "destructive",
                        });
                }
        };

        const handleUpdateMember = async (data: z.infer<typeof FormSchema>) => {
                const result = await updateMutation.mutate({
                        id: "demo-todo",
                        todo: data,
                });

                if (result.status === "synced") {
                        toast({
                                title: "Todo updated",
                                description: "Your changes have been saved.",
                        });
                        document.getElementById("update-trigger")?.click();
                        return;
                }

                if (result.status === "queued") {
                        toast({
                                title: "Offline - update queued",
                                description: "We'll apply these changes once you're back online.",
                        });
                        document.getElementById("update-trigger")?.click();
                        return;
                }

                if (result.status === "conflict") {
                        toast({
                                title: "Todo update conflict",
                                description: result.error.message,
                                variant: "destructive",
                        });
                }
        };

        async function onSubmit(data: z.infer<typeof FormSchema>) {
                if (isEdit) {
                        await handleUpdateMember(data);
                } else {
                        await handleCreateMember(data);
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
                                        disabled={isProcessing}
                                >
                                        {isProcessing ? "Saving..." : "Submit"}
                                </Button>
                                {queuedCount > 0 && (
                                        <p className="text-sm text-muted-foreground" role="status">
                                                {queuedCount} todo
                                                {queuedCount > 1 ? "s" : ""} waiting to sync when you're online.
                                        </p>
                                )}
                        </form>
                </Form>
        );
}