"use server";

import { createSupbaseServerClient } from "@/utils/supaone";

type TourStatus = {
        hasSeenTour: boolean;
};

async function withAuthenticatedClient() {
        const supabase = await createSupbaseServerClient();
        const {
                data: { user },
                error,
        } = await supabase.auth.getUser();

        if (error) {
                throw new Error("Unable to determine the current session");
        }

        if (!user) {
                throw new Error("No authenticated user found for dashboard tour updates");
        }

        return { supabase, userId: user.id } as const;
}

export async function getTourStatus(): Promise<TourStatus> {
        const { supabase, userId } = await withAuthenticatedClient();
        const { data, error } = await supabase
                .from("profiles")
                .select("has_seen_tour")
                .eq("id", userId)
                .maybeSingle();

        if (error && error.code !== "PGRST116") {
                throw new Error("Unable to read the dashboard tour status");
        }

        return {
                hasSeenTour: data?.has_seen_tour ?? false,
        };
}

export async function completeTour(): Promise<TourStatus> {
        return updateTourState(true);
}

export async function requestTourReplay(): Promise<TourStatus> {
        return updateTourState(false);
}

async function updateTourState(hasSeenTour: boolean): Promise<TourStatus> {
        const { supabase, userId } = await withAuthenticatedClient();
        const { data, error } = await supabase
                .from("profiles")
                .update({
                        has_seen_tour: hasSeenTour,
                        updated_at: new Date().toISOString(),
                })
                .eq("id", userId)
                .select("has_seen_tour")
                .maybeSingle();

        if (error && error.code !== "PGRST116") {
                throw new Error("Unable to update the dashboard tour preference");
        }

        return {
                hasSeenTour: data?.has_seen_tour ?? hasSeenTour,
        };
}
