"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
import { Input } from "@/components/ui/input";
import {
        Select,
        SelectContent,
        SelectItem,
        SelectTrigger,
        SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

import { updateMemberProfileAction } from "./actions";

const profileSchema = z.object({
        fullName: z
                .string()
                .trim()
                .min(2, { message: "Name must be at least 2 characters." })
                .max(120, { message: "Name must be 120 characters or less." }),
        defaultHouseholdId: z
                .union([
                        z.string().trim().min(1, { message: "Select a household or choose none." }),
                        z.literal("none"),
                ])
                .default("none"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export type HouseholdOption = {
        id: string;
        name: string | null;
};

type MemberProfile = {
        id: string | null;
        fullName: string;
        avatarUrl: string | null;
        defaultHouseholdId: string | null;
};

type ProfileFormProps = {
        member: MemberProfile;
        households: HouseholdOption[];
};

export function ProfileForm({ member, households }: ProfileFormProps) {
        const { toast } = useToast();
        const fileInputRef = useRef<HTMLInputElement | null>(null);
        const [avatarPreview, setAvatarPreview] = useState<string | null>(member.avatarUrl);
        const [selectedFile, setSelectedFile] = useState<File | null>(null);
        const [isPending, startTransition] = useTransition();

        const defaultHouseholdValue = useMemo(() => {
                if (!member.defaultHouseholdId) {
                        return "none";
                }

                return member.defaultHouseholdId;
        }, [member.defaultHouseholdId]);

        const form = useForm<ProfileFormValues>({
                resolver: zodResolver(profileSchema),
                defaultValues: {
                        fullName: member.fullName,
                        defaultHouseholdId: defaultHouseholdValue,
                },
        });

        const handleAvatarChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
                const file = event.target.files?.[0];
                if (!file) {
                        return;
                }

                if (!file.type.startsWith("image/")) {
                        toast({
                                title: "Unsupported file",
                                description: "Please choose a JPG, PNG, or GIF image.",
                                variant: "destructive",
                        });
                        return;
                }

                const maxFileSize = 5 * 1024 * 1024;
                if (file.size > maxFileSize) {
                        toast({
                                title: "File too large",
                                description: "Avatars can be a maximum of 5MB.",
                                variant: "destructive",
                        });
                        return;
                }

                setSelectedFile(file);
        };

        useEffect(() => {
                if (!selectedFile) {
                        return;
                }

                const nextPreview = URL.createObjectURL(selectedFile);
                setAvatarPreview(nextPreview);

                return () => {
                        URL.revokeObjectURL(nextPreview);
                };
        }, [selectedFile]);

        const onSubmit = (values: ProfileFormValues) => {
                const formData = new FormData();
                formData.append("full_name", values.fullName.trim());

                if (values.defaultHouseholdId === "none") {
                        formData.append("default_household_id", "");
                } else {
                        formData.append("default_household_id", values.defaultHouseholdId);
                }

                if (selectedFile) {
                        formData.append("avatar", selectedFile);
                }

                startTransition(() => {
                        updateMemberProfileAction(formData)
                                .then((result) => {
                                        if (!result.success) {
                                                toast({
                                                        title: "Profile update failed",
                                                        description: result.error ?? "We couldn't save your changes.",
                                                        variant: "destructive",
                                                });
                                                return;
                                        }

                                        if (result.data?.avatarUrl) {
                                                setAvatarPreview(result.data.avatarUrl);
                                        }

                                        setSelectedFile(null);
                                        if (fileInputRef.current) {
                                                fileInputRef.current.value = "";
                                        }

                                        toast({
                                                title: "Profile updated",
                                                description: "Your roommate profile is up to date.",
                                        });
                                })
                                .catch((error) => {
                                        console.error("Profile update error", error);
                                        toast({
                                                title: "Profile update failed",
                                                description: "Something went wrong while saving your profile.",
                                                variant: "destructive",
                                        });
                                });
                });
        };

        const householdOptions = useMemo(() => {
                if (!households.length) {
                        return [];
                }

                return households.map((household) => ({
                        id: household.id,
                        name: household.name ?? "Unnamed household",
                }));
        }, [households]);

        return (
                <Card>
                        <CardHeader>
                                <CardTitle>Roommate profile</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-8">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                        <Avatar className="size-20">
                                                {avatarPreview ? (
                                                        <AvatarImage
                                                                alt="Member avatar"
                                                                src={avatarPreview}
                                                                className="size-20 rounded-full object-cover"
                                                        />
                                                ) : (
                                                        <AvatarFallback className="text-lg font-medium">
                                                                {member.fullName
                                                                        .split(" ")
                                                                        .map((part) => part.charAt(0))
                                                                        .join("")
                                                                        .slice(0, 2)
                                                                        .toUpperCase() || "RM"}
                                                        </AvatarFallback>
                                                )}
                                        </Avatar>
                                        <div className="space-y-2">
                                                <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => fileInputRef.current?.click()}
                                                >
                                                        Change avatar
                                                </Button>
                                                <FormDescription>
                                                        Use a clear photo so roommates can recognise you. PNG, JPG, or GIF up to 5MB.
                                                </FormDescription>
                                                <input
                                                        ref={fileInputRef}
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={handleAvatarChange}
                                                />
                                        </div>
                                </div>
                                <Form {...form}>
                                        <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
                                                <FormField
                                                        control={form.control}
                                                        name="fullName"
                                                        render={({ field }) => (
                                                                <FormItem>
                                                                        <FormLabel>Display name</FormLabel>
                                                                        <FormControl>
                                                                                <Input placeholder="e.g. Alex Johnson" {...field} />
                                                                        </FormControl>
                                                                        <FormDescription>
                                                                                This name appears on bookings, payments, and shared messages.
                                                                        </FormDescription>
                                                                        <FormMessage />
                                                                </FormItem>
                                                        )}
                                                />
                                                <FormField
                                                        control={form.control}
                                                        name="defaultHouseholdId"
                                                        render={({ field }) => (
                                                                <FormItem>
                                                                        <FormLabel>Default household</FormLabel>
                                                                        <Select
                                                                                onValueChange={field.onChange}
                                                                                value={field.value}
                                                                                disabled={!householdOptions.length}
                                                                        >
                                                                                <FormControl>
                                                                                        <SelectTrigger>
                                                                                                <SelectValue placeholder="Choose a household" />
                                                                                        </SelectTrigger>
                                                                                </FormControl>
                                                                                <SelectContent>
                                                                                        <SelectItem value="none">No default household</SelectItem>
                                                                                        {householdOptions.map((option) => (
                                                                                                <SelectItem key={option.id} value={option.id}>
                                                                                                        {option.name}
                                                                                                </SelectItem>
                                                                                        ))}
                                                                                </SelectContent>
                                                                        </Select>
                                                                        <FormDescription>
                                                                                We’ll open this household by default when you sign in.
                                                                        </FormDescription>
                                                                        <FormMessage />
                                                                </FormItem>
                                                        )}
                                                />
                                                <CardFooter className="px-0">
                                                        <Button type="submit" disabled={isPending}>
                                                                {isPending ? "Saving changes…" : "Save profile"}
                                                        </Button>
                                                </CardFooter>
                                        </form>
                                </Form>
                        </CardContent>
                </Card>
        );
}

export default ProfileForm;
