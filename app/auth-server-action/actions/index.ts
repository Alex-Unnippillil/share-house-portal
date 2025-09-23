"use server";

import { createSupbaseServerClient } from "@/utils/supaone";
import { redirect } from "next/navigation";

import type { Database } from "@/lib/supabase";
import { normalizeReferralCode } from "@/lib/referrals";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export async function signUpWithEmailAndPassword(data: {
        email: string;
        password: string;
        confirm: string;
        referralCode?: string;
}) {
        const supabase = await createSupbaseServerClient();

        const { referralCode, ...authPayload } = data;

        const result = await supabase.auth.signUp(authPayload);

        const normalizedCode = normalizeReferralCode(referralCode);

        if (normalizedCode) {
                await processReferralSignup({
                        referralCode: normalizedCode,
                        email: data.email,
                        referredUserId: result.data?.user?.id ?? null,
                });
        }

        return JSON.stringify(result);
}

export async function logout() {
	const supabase = await createSupbaseServerClient();
        await supabase.auth.signOut();
        redirect("/auth");
}

interface ProcessReferralSignupParams {
        referralCode: string;
        email: string;
        referredUserId: string | null;
}

type ReferralCodeRow = Database["public"]["Tables"]["referral_codes"]["Row"];

async function processReferralSignup({
        referralCode,
        email,
        referredUserId,
}: ProcessReferralSignupParams) {
        try {
                const serviceClient = createServiceRoleClient();

                const { data: code, error: codeError } = await serviceClient
                        .from("referral_codes")
                        .select("id, user_id, usage_count, max_uses, expires_at")
                        .eq("code", referralCode)
                        .maybeSingle<Pick<ReferralCodeRow, "id" | "user_id" | "usage_count" | "max_uses" | "expires_at">>();

                if (codeError || !code) {
                        if (codeError) {
                                console.error("Failed to look up referral code", codeError);
                        }
                        return;
                }

                if (code.expires_at && new Date(code.expires_at) < new Date()) {
                        return;
                }

                if (code.max_uses && code.usage_count >= code.max_uses) {
                        return;
                }

                const now = new Date().toISOString();

                const { data: referrals, error: referralError } = await serviceClient
                        .from("referrals")
                        .insert({
                                referral_code_id: code.id,
                                referrer_id: code.user_id,
                                referred_email: email,
                                referred_user_id: referredUserId,
                                status: referredUserId ? "signed_up" : "invited",
                                invited_at: now,
                                signed_up_at: referredUserId ? now : null,
                        })
                        .select()
                        .returns<Database["public"]["Tables"]["referrals"]["Row"][]>();

                if (referralError || !referrals?.length) {
                        if (referralError) {
                                console.error("Failed to create referral entry", referralError);
                        }
                        return;
                }

                await serviceClient
                        .from("referral_codes")
                        .update({ usage_count: (code.usage_count ?? 0) + 1 })
                        .eq("id", code.id);
        } catch (error) {
                console.error("Referral signup processing failed", error);
        }
}



