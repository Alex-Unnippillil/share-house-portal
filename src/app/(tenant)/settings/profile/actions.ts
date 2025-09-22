"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupbaseServerClient } from "@/utils/supaone";

const profileUpdateSchema = z.object({
        full_name: z
                .string()
                .trim()
                .min(2, { message: "Name must be at least 2 characters." })
                .max(120, { message: "Name must be 120 characters or less." }),
        default_household_id: z
                .string()
                .trim()
                .max(64, { message: "Household identifier is too long." })
                .nullable(),
});

export type UpdateMemberProfileResult = {
        success: boolean;
        error?: string;
        data?: {
                avatarUrl?: string | null;
        };
};

export async function updateMemberProfileAction(formData: FormData): Promise<UpdateMemberProfileResult> {
        const supabase = await createSupbaseServerClient();

        const {
                data: { user },
                error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
                return {
                        success: false,
                        error: "You need to be signed in to update your profile.",
                };
        }

        const rawFullName = formData.get("full_name");
        const rawHouseholdId = formData.get("default_household_id");
        const avatarFile = formData.get("avatar");

        const parsedInput = profileUpdateSchema.safeParse({
                full_name: typeof rawFullName === "string" ? rawFullName : "",
                default_household_id:
                        typeof rawHouseholdId === "string" && rawHouseholdId.length > 0
                                ? rawHouseholdId
                                : null,
        });

        if (!parsedInput.success) {
                const message = parsedInput.error.errors
                        .map((err) => err.message)
                        .join(" ");

                return {
                        success: false,
                        error: message || "Invalid profile details provided.",
                };
        }

        const parsedData = parsedInput.data;

        const {
                data: existingMember,
                error: memberLookupError,
        } = await supabase
                .from("members")
                .select("id, avatar_url")
                .eq("user_id", user.id)
                .maybeSingle();

        if (memberLookupError) {
                console.error("Failed to load member profile", memberLookupError);
                return {
                        success: false,
                        error: "Unable to load your profile record right now.",
                };
        }

        let avatarPath = existingMember?.avatar_url ?? null;
        let publicAvatarUrl: string | null = null;

        if (avatarFile instanceof File && avatarFile.size > 0) {
                if (!avatarFile.type.startsWith("image/")) {
                        return {
                                success: false,
                                error: "Avatar uploads must be image files.",
                        };
                }

                const maxFileSize = 5 * 1024 * 1024;
                if (avatarFile.size > maxFileSize) {
                        return {
                                success: false,
                                error: "Avatars must be 5MB or smaller.",
                        };
                }

                const extension = avatarFile.name.split(".").pop()?.toLowerCase() ?? "png";
                const fileName = `${crypto.randomUUID()}.${extension}`;
                const filePath = `avatars/${user.id}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                        .from("docs")
                        .upload(filePath, avatarFile, {
                                cacheControl: "3600",
                                upsert: true,
                                contentType: avatarFile.type,
                        });

                if (uploadError) {
                        console.error("Avatar upload failed", uploadError);
                        return {
                                success: false,
                                error: "We couldn't save your avatar. Please try again.",
                        };
                }

                if (avatarPath && avatarPath !== filePath) {
                        try {
                                await supabase.storage.from("docs").remove([avatarPath]);
                        } catch (removalError) {
                                console.warn("Failed to clean up previous avatar", removalError);
                        }
                }

                avatarPath = filePath;

                const { data: publicUrlData } = supabase.storage
                        .from("docs")
                        .getPublicUrl(filePath);

                publicAvatarUrl = publicUrlData?.publicUrl ?? null;
        } else if (avatarPath) {
                const { data: publicUrlData } = supabase.storage
                        .from("docs")
                        .getPublicUrl(avatarPath);

                publicAvatarUrl = publicUrlData?.publicUrl ?? null;
        }

        const timestamp = new Date().toISOString();
        const updates = {
                full_name: parsedData.full_name,
                default_household_id: parsedData.default_household_id,
                avatar_url: avatarPath,
                updated_at: timestamp,
        };

        if (existingMember?.id) {
                const { error: updateError } = await supabase
                        .from("members")
                        .update(updates)
                        .eq("id", existingMember.id);

                if (updateError) {
                        console.error("Failed to update member", updateError);
                        return {
                                success: false,
                                error: "We couldn't update your profile. Please try again.",
                        };
                }
        } else {
                const { error: insertError } = await supabase.from("members").insert({
                        ...updates,
                        user_id: user.id,
                        created_at: timestamp,
                });

                if (insertError) {
                        console.error("Failed to create member", insertError);
                        return {
                                success: false,
                                error: "We couldn't create your profile record.",
                        };
                }
        }

        revalidatePath("/settings/profile");

        return {
                success: true,
                data: {
                        avatarUrl: publicAvatarUrl,
                },
        };
}
