"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupbaseServerClient } from "@/utils/supaone";
import type { SupplyActionState } from "@/types/supplies";

const SUPPLY_SPLIT_VALUES = ["equal", "weighted"] as const;

const booleanFromString = z
        .union([z.literal("true"), z.literal("false")])
        .transform((value) => value === "true");

const quantitySchema = z
        .coerce
        .number({ invalid_type_error: "Default quantity must be a number" })
        .int({ message: "Default quantity must be a whole number" })
        .min(1, { message: "Default quantity must be at least 1" })
        .max(9999, { message: "Default quantity must be below 10,000" });

const createItemSchema = z.object({
        name: z
                .string({ required_error: "Name is required" })
                .trim()
                .min(1, { message: "Name is required" })
                .max(120, { message: "Name must be 120 characters or fewer" }),
        category: z
                .string({ required_error: "Category is required" })
                .trim()
                .min(1, { message: "Category is required" })
                .max(60, { message: "Category must be 60 characters or fewer" }),
        description: z
                .string({ invalid_type_error: "Description must be text" })
                .trim()
                .max(500, { message: "Description must be 500 characters or fewer" })
                .optional(),
        unit: z
                .string({ required_error: "Unit is required" })
                .trim()
                .min(1, { message: "Unit is required" })
                .max(20, { message: "Unit must be 20 characters or fewer" }),
        default_quantity: quantitySchema,
        default_split: z.enum(SUPPLY_SPLIT_VALUES),
        is_active: booleanFromString,
});

const updateItemSchema = z.object({
        id: z
                .string({ required_error: "Supply item id is required" })
                .uuid({ message: "Invalid supply item id" }),
        unit: z
                .string({ required_error: "Unit is required" })
                .trim()
                .min(1, { message: "Unit is required" })
                .max(20, { message: "Unit must be 20 characters or fewer" }),
        default_quantity: quantitySchema,
        default_split: z.enum(SUPPLY_SPLIT_VALUES),
        is_active: booleanFromString,
});

const formatFieldErrors = (error: z.ZodError): Record<string, string> => {
        const fieldErrors = error.flatten().fieldErrors;
        return Object.fromEntries(
                Object.entries(fieldErrors)
                        .filter(([, messages]) => messages && messages.length)
                        .map(([field, messages]) => [field, messages![0] as string])
        );
};

const sanitizeOptionalText = (value: FormDataEntryValue | null | undefined) => {
        if (typeof value !== "string") {
                return undefined;
        }

        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
};

const sanitizeString = (value: FormDataEntryValue | null | undefined) =>
        (typeof value === "string" ? value : "");

export async function createSupplyItem(
        _prevState: SupplyActionState,
        formData: FormData
): Promise<SupplyActionState> {
        const submission = {
                name: sanitizeString(formData.get("name")),
                category: sanitizeString(formData.get("category")),
                description: sanitizeOptionalText(formData.get("description")),
                unit: sanitizeString(formData.get("unit")),
                default_quantity: sanitizeString(formData.get("default_quantity")),
                default_split: sanitizeString(formData.get("default_split")),
                is_active: sanitizeString(formData.get("is_active")) || "true",
        };

        const parsed = createItemSchema.safeParse(submission);

        if (!parsed.success) {
                return {
                        status: "error",
                        message: "Please review the highlighted fields.",
                        fieldErrors: formatFieldErrors(parsed.error),
                };
        }

        const payload = parsed.data;

        const supabase = await createSupbaseServerClient();
        const { error } = await supabase.from("supply_items").insert({
                name: payload.name,
                category: payload.category,
                description: payload.description ?? null,
                unit: payload.unit,
                default_quantity: payload.default_quantity,
                default_split: payload.default_split,
                is_active: payload.is_active,
        });

        if (error) {
                console.error("createSupplyItem", error);
                return {
                        status: "error",
                        message: "Unable to create supply item. Please try again.",
                };
        }

        revalidatePath("/dashboard/supplies");

        return {
                status: "success",
                message: `${payload.name} added to the catalog.`,
        };
}

export async function updateSupplyItem(
        _prevState: SupplyActionState,
        formData: FormData
): Promise<SupplyActionState> {
        const submission = {
                id: sanitizeString(formData.get("id")),
                unit: sanitizeString(formData.get("unit")),
                default_quantity: sanitizeString(formData.get("default_quantity")),
                default_split: sanitizeString(formData.get("default_split")),
                is_active: sanitizeString(formData.get("is_active")) || "true",
        };

        const parsed = updateItemSchema.safeParse(submission);

        if (!parsed.success) {
                return {
                        status: "error",
                        message: "Unable to save your changes.",
                        fieldErrors: formatFieldErrors(parsed.error),
                };
        }

        const payload = parsed.data;
        const supabase = await createSupbaseServerClient();
        const { data, error } = await supabase
                .from("supply_items")
                .update({
                        unit: payload.unit,
                        default_quantity: payload.default_quantity,
                        default_split: payload.default_split,
                        is_active: payload.is_active,
                        updated_at: new Date().toISOString(),
                })
                .eq("id", payload.id)
                .select("name")
                .maybeSingle();

        if (error) {
                console.error("updateSupplyItem", error);
                return {
                        status: "error",
                        message: "Unable to save your changes. Please try again.",
                };
        }

        if (!data) {
                return {
                        status: "error",
                        message: "That supply item no longer exists.",
                };
        }

        revalidatePath("/dashboard/supplies");

        return {
                status: "success",
                message: `${data.name} defaults updated.`,
        };
}

export async function deleteSupplyItem(formData: FormData) {
        const id = sanitizeString(formData.get("id"));

        if (!id) {
                return;
        }

        const supabase = await createSupbaseServerClient();
        const { error } = await supabase.from("supply_items").delete().eq("id", id);

        if (error) {
                console.error("deleteSupplyItem", error);
                throw new Error("Unable to delete supply item");
        }

        revalidatePath("/dashboard/supplies");
}
