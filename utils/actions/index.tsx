"use server";
import { createSupabaseServerClientReadOnly } from "../supaone";

export async function readUserSession() {
	const supabase = await createSupabaseServerClientReadOnly();

	return supabase.auth.getSession();
}