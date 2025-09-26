"use server";
import { createServerClient } from "@/lib/supabase-client";

export async function readUserSession() {
        const supabase = createServerClient();

        return supabase.auth.getSession();
}