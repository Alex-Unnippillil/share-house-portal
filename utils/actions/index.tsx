"use server";
import { createSupbaseServerClientReadOnly } from "../supaone";
import type { AppRole } from "@/config/rbac";

export type DashboardProfile = {
        id: string;
        full_name: string | null;
        email: string | null;
        avatar_url: string | null;
        role: AppRole | null;
};

export async function readUserSession() {
        const supabase = await createSupbaseServerClientReadOnly();

        return supabase.auth.getSession();
}

export async function readUserProfile(): Promise<DashboardProfile | null> {
        const supabase = await createSupbaseServerClientReadOnly();

        const {
                data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user?.id) {
                return null;
        }

        const { data, error } = await supabase
                .from("profiles")
                .select("id, full_name, email, avatar_url, role")
                .eq("id", session.user.id)
                .maybeSingle();

        if (error) {
                console.error("Failed to read user profile", error);
                return null;
        }

        if (!data) {
                return null;
        }

        return {
                id: data.id,
                full_name: data.full_name,
                email: data.email,
                avatar_url: data.avatar_url,
                role: (data.role as AppRole | null) ?? null,
        };
}