"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { AiOutlineLoading3Quarters } from "react-icons/ai";

import {
        Form,
        FormControl,
        FormField,
        FormItem,
        FormLabel,
        FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { createTodo } from "../actions";

const FormSchema = z.object({
        title: z.string().min(3, {
                message: "Title must be at least 3 characters.",
        }),
        details: z.string().min(10, {
                message: "Add a few more details so the task is clear.",
        }),
});

export default function CreateForm() {
        const [isPending, startTransition] = useTransition();
        const router = useRouter();

        const form = useForm<z.infer<typeof FormSchema>>({
                resolver: zodResolver(FormSchema),
                defaultValues: {
                        title: "",
                        details: "",
                },
        });

        function onSubmit(data: z.infer<typeof FormSchema>) {
                startTransition(async () => {
                        const result = await createTodo({
                                title: data.title.trim(),
                                task: data.details.trim(),
                        });

                        if (!result.success) {
                                toast({
                                        title: "Unable to create task",
                                        description: result.error,
                                        variant: "destructive",
                                });
                                return;
                        }

                        toast({
                                title: "Task created",
                                description: "Your payment scheduling step has been added to the list.",
                        });
                        form.reset();
                        router.refresh();
                });
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
                                                                        placeholder="Outline the next step to move the payment forward"
                                                                        {...field}
                                                                        onChange={field.onChange}
                                                                        rows={4}
                                                                />
                                                        </FormControl>
                                                        <FormMessage />
                                                </FormItem>
                                        )}
                                />
                                <Button
                                        type="submit"
                                        className={cn("flex w-full items-center justify-center gap-2", {
                                                "cursor-not-allowed opacity-75": isPending,
                                        })}
                                        variant="outline"
                                        disabled={isPending}
                                >
                                        {isPending ? "Creating" : "Create"}
                                        <AiOutlineLoading3Quarters
                                                className={cn("size-4 animate-spin", { hidden: !isPending })}
                                        />
                                </Button>

                        </form>
                </Form>
        );
}
