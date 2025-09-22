"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { useTransition } from "react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { addToBuyItem } from "../actions";
import { PRIORITY_LEVELS, PRIORITY_LABELS } from "../constants";

const prioritySchema = z.enum(PRIORITY_LEVELS);

const formSchema = z
  .object({
    itemName: z.string().trim().optional(),
    supplyItemId: z.string().uuid().optional().or(z.literal("")),
    priority: prioritySchema,
  })
  .transform((value) => ({
    ...value,
    supplyItemId: value.supplyItemId ? value.supplyItemId : undefined,
  }))
  .refine(
    (value) => Boolean(value.itemName?.length) || Boolean(value.supplyItemId),
    {
      message: "Select an item or provide a name to add a new one.",
      path: ["itemName"],
    },
  );

type FormValues = z.infer<typeof formSchema>;

type CreateFormProps = {
  existingItems: Array<{ id: string; name: string }>;
};

export default function CreateForm({ existingItems }: CreateFormProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      itemName: "",
      supplyItemId: undefined,
      priority: "medium",
    },
  });

  const selectedSupplyId = form.watch("supplyItemId");

  async function onSubmit(values: FormValues) {
    startTransition(async () => {
      try {
        await addToBuyItem({
          itemName: values.itemName,
          supplyItemId: values.supplyItemId,
          priority: values.priority,
        });

        const resolvedName =
          values.itemName && values.itemName.length > 0
            ? values.itemName
            : existingItems.find((item) => item.id === values.supplyItemId)?.name ?? "Existing item";

        toast({
          title: "Added to your list",
          description: `${resolvedName} scheduled with ${PRIORITY_LABELS[values.priority]} priority.`,
        });

        form.reset({ itemName: "", supplyItemId: undefined, priority: "medium" });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to add this supply item right now.";
        toast({
          variant: "destructive",
          title: "Something went wrong",
          description: message,
        });
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="supplyItemId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Use an existing supply</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(value === "" ? undefined : value)}
                value={field.value ?? ""}
                disabled={isPending}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select from your catalog" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="">Create a new supply</SelectItem>
                  {existingItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="itemName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New supply name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Paper towels"
                  {...field}
                  value={field.value ?? ""}
                  disabled={Boolean(selectedSupplyId) || isPending}
                  onChange={(event) => field.onChange(event.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PRIORITY_LEVELS.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {PRIORITY_LABELS[priority]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="flex w-full items-center justify-center gap-2" disabled={isPending}>
          Add to list
          <AiOutlineLoading3Quarters
            className={`size-4 ${isPending ? "animate-spin" : "hidden"}`}
            aria-hidden="true"
          />
        </Button>
      </form>
    </Form>
  );
}
