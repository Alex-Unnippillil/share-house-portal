import React from "react";
import AuthForm from "./components/AuthForm";
import { readUserSession } from "@/utils/actions";
import { redirect } from "next/navigation";
import { Icons } from '@/components/icons'
import { cn } from "@/lib/utils"
import SmartLink from "@/components/navigation/SmartLink"
import { siteConfig } from "@/config/site"
import { buttonVariants } from "@/components/ui/button"

export default async function page() {
        const { data: userSession } = await readUserSession();

        if (userSession.session) {
                return redirect("/");
        }
        return (
        <div className="mt-10 px-2 lg:p-8">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            <div className="flex flex-col items-center space-y-2 text-center">
      <SmartLink href="/" className="mb-8 inline-flex">
        <span className="flex items-center space-x-2">
          <Icons.logo className="size-8" />
          <span className="inline-block font-bold">{siteConfig.name}</span>
        </span>
      </SmartLink>
              <h1 className="text-2xl font-semibold tracking-tight">
                Welcome back!
              </h1>
              <p className="text-sm text-muted-foreground">
               Login to your Roomsily account.
              </p>
            </div>
            <AuthForm />
            <p className="px-8 text-center text-sm text-muted-foreground">
              By clicking continue, you agree to our{" "}
              <SmartLink
                href="/terms"
                className="underline underline-offset-4 hover:text-primary"
              >
                Terms of Service
              </SmartLink>{" "}
              and{" "}
              <SmartLink
                href="/privacy"
                className="underline underline-offset-4 hover:text-primary"
              >
                Privacy Policy
              </SmartLink>
              .
            </p>
          </div>
        </div>

        );
}