import React from "react";
import AuthForm from "./components/AuthForm";
import { readUserSession } from "@/utils/actions";
import { redirect } from "next/navigation";
import { Icons } from "@/components/icons";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { readSupabaseSessionFromCookie } from "@/utils/supabase-session";

export default async function page() {
        const cookieSession = readSupabaseSessionFromCookie();

        if (cookieSession) {
                return redirect("/account");
        }

        const { data: userSession } = await readUserSession();

        if (userSession.session) {
                return redirect("/account");
        }
        return (
                <div className="mt-10 px-2 lg:p-8">
                        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
                                <div className="flex flex-col items-center space-y-2 text-center">
                                        <Link href="/" className="mb-8 flex items-center space-x-2">
                                                <Icons.logo className="size-8" />
                                                <span className="inline-block font-bold">{siteConfig.name}</span>
                                        </Link>
                                        <h1 className="text-2xl font-semibold tracking-tight">
                                                Welcome back!
                                        </h1>
                                        <p className="text-sm text-muted-foreground">
                                                Login to your Onyx account.
                                        </p>
                                </div>
                                <AuthForm />
                                <p className="px-8 text-center text-sm text-muted-foreground">
                                        By clicking continue, you agree to our{" "}
                                        <Link
                                                href="/terms"
                                                className="underline underline-offset-4 hover:text-primary"
                                        >
                                                Terms of Service
                                        </Link>{" "}
                                        and{" "}
                                        <Link
                                                href="/privacy"
                                                className="underline underline-offset-4 hover:text-primary"
                                        >
                                                Privacy Policy
                                        </Link>
                                        .
                                </p>
                        </div>
                </div>
        );
}
