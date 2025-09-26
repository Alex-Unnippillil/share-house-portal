"use server";

import { createServerClient } from "@/lib/supabase-client";
import { redirect } from "next/navigation";

export async function signUpWithEmailAndPassword(data: {
	email: string;
	password: string;
	confirm: string;
}) {
        const supabase = createServerClient();

	const result = await supabase.auth.signUp(data);
	return JSON.stringify(result);
}

export async function logout() {
        const supabase = createServerClient();
	await supabase.auth.signOut();
	redirect("/auth");
}



