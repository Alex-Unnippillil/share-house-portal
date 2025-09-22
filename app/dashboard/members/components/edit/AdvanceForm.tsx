"use client";

import { useEffect } from "react";
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
        FormDescription,
} from "@/components/ui/form";
import {
        Select,
        SelectContent,
        SelectItem,
        SelectTrigger,
        SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { cn } from "@/lib/utils";
import { RESIDENT_ROLES, MANAGEMENT_ROLES, rolesForPersona } from "@/lib/members";
import type { AssignableRole } from "@/lib/members";

const profileTypes = ["resident", "management"] as const;
const assignableRoles = [...RESIDENT_ROLES, ...MANAGEMENT_ROLES] as const;

const FormSchema = z
        .object({
                persona: z.enum(profileTypes),
                role: z.enum(assignableRoles),
                status: z.enum(["active", "resigned"]),
        })
        .refine(
                (data) => rolesForPersona(data.persona).includes(data.role),
                {
                        message: "Role must align with the selected profile type.",
                        path: ["role"],
                },
        );

export default function AdvanceForm() {
        const status = ["active", "resigned"];

        const form = useForm<z.infer<typeof FormSchema>>({
                resolver: zodResolver(FormSchema),
                defaultValues: {
                        persona: "resident",
                        role: RESIDENT_ROLES[0],
                        status: "active",
                },
        });

        const persona = form.watch("persona");

        useEffect(() => {
                const availableRoles = rolesForPersona(persona);
                const currentRole = form.getValues("role") as AssignableRole;

                if (!availableRoles.includes(currentRole)) {
                        form.setValue("role", availableRoles[0], {
                                shouldDirty: true,
                                shouldValidate: true,
                        });
                }
        }, [form, persona]);

        function onSubmit(data: z.infer<typeof FormSchema>) {
                toast({
                        title: "You submitted the following values:",
                        description: (
                                <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
                                        <code className="text-white">
                                                {JSON.stringify(data, null, 2)}
                                        </code>
                                </pre>
                        ),
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
                                        name="persona"
                                        render={({ field }) => (
                                                <FormItem>
                                                        <FormLabel>Profile type</FormLabel>
                                                        <Select
                                                                onValueChange={field.onChange}
                                                                defaultValue={field.value}
                                                        >
                                                                <FormControl>
                                                                        <SelectTrigger>
                                                                                <SelectValue placeholder="Select a profile type" />
                                                                        </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                        {profileTypes.map((type) => (
                                                                                <SelectItem key={type} value={type}>
                                                                                        {type === "resident" ? "Resident" : "Property management"}
                                                                                </SelectItem>
                                                                        ))}
                                                                </SelectContent>
                                                        </Select>
                                                        <FormDescription>
                                                                Keep residents and management separated so permissions stay accurate.
                                                        </FormDescription>
                                                        <FormMessage />
                                                </FormItem>
                                        )}
                                />
                                <FormField
                                        control={form.control}
                                        name="role"
                                        render={({ field }) => (
                                                <FormItem>
                                                        <FormLabel>Role</FormLabel>
                                                        <Select
                                                                onValueChange={field.onChange}
                                                                defaultValue={field.value}
                                                        >
                                                                <FormControl>
                                                                        <SelectTrigger>
                                                                                <SelectValue placeholder="Select a role" />
                                                                        </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                        {(persona === "management" ? MANAGEMENT_ROLES : RESIDENT_ROLES).map((role) => (
                                                                                <SelectItem value={role} key={role}>
                                                                                        {role.replace("_", " ")}
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
                                        name="status"
                                        render={({ field }) => (
                                                <FormItem>
                                                        <FormLabel>Status</FormLabel>
                                                        <Select
                                                                onValueChange={field.onChange}
                                                                defaultValue={field.value}
                                                        >
                                                                <FormControl>
                                                                        <SelectTrigger>
                                                                                <SelectValue placeholder="Select user status" />
                                                                        </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                        {status.map((item) => (
                                                                                <SelectItem value={item} key={item}>
                                                                                        {item}
                                                                                </SelectItem>
                                                                        ))}
                                                                </SelectContent>
                                                        </Select>
                                                        <FormDescription>
                                                                Status &quot;resigned&quot; means the member is no longer active in the property.
                                                        </FormDescription>
                                                        <FormMessage />
                                                </FormItem>
                                        )}
                                />
                                <Button
                                        type="submit"
                                        className="flex w-full items-center gap-2"
                                        variant="outline"
                                >
                                        Update{" "}
                                        <AiOutlineLoading3Quarters
                                                className={cn(" animate-spin", "hidden")}
                                        />
                                </Button>
                        </form>
                </Form>
        );
}
