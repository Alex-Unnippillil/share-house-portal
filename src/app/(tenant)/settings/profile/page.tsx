import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createSupbaseServerClient } from "@/utils/supaone";

import ProfileForm, { type HouseholdOption } from "./profile-form";

export const metadata: Metadata = {
        title: "Profile settings",
        description:
                "Update the details your roommates see – upload an avatar, refresh your display name, and set your default household view.",
};

export default async function TenantProfileSettingsPage() {
        const supabase = await createSupbaseServerClient();

        const {
                data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
                redirect("/auth");
        }

        const { data: member, error: memberError } = await supabase
                .from("members")
                .select("id, full_name, avatar_url, default_household_id")
                .eq("user_id", user.id)
                .maybeSingle();

        if (memberError) {
                console.error("Failed to load member details", memberError);
        }

        let avatarPublicUrl: string | null = null;
        if (member?.avatar_url) {
                const { data: publicUrlData } = supabase.storage
                        .from("docs")
                        .getPublicUrl(member.avatar_url);

                avatarPublicUrl = publicUrlData?.publicUrl ?? null;
        }

        const { data: householdsData, error: householdsError } = await supabase
                .from("households")
                .select("id, name")
                .order("name", { ascending: true });

        if (householdsError) {
                console.error("Failed to load households", householdsError);
        }

        const households: HouseholdOption[] =
                householdsData?.map((household) => ({
                        id: household.id,
                        name: household.name ?? null,
                })) ?? [];

        return (
                <div className="container mx-auto max-w-3xl space-y-8 px-4 py-10">
                        <div className="space-y-2">
                                <h1 className="text-3xl font-bold tracking-tight">Profile preferences</h1>
                                <p className="text-muted-foreground">
                                        Keep your roommate profile current so shared payments, chores, and booking reminders reach the right person.
                                </p>
                        </div>
                        <ProfileForm
                                member={{
                                        id: member?.id ?? null,
                                        fullName: member?.full_name ?? user.email ?? "",
                                        avatarUrl: avatarPublicUrl,
                                        defaultHouseholdId: member?.default_household_id ?? null,
                                }}
                                households={households}
                        />
                </div>
        );
}
