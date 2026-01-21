import { Metadata } from "next"
import SmartLink from "@/components/navigation/SmartLink"

import { TenantOnboardingForm } from './components/tenant-onboarding-form'

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { AuthFormLegacy } from '@/app/auth-server-action/components/AuthFormLegacy'

export const metadata: Metadata = {
  title: "Onboarding",
  description: "Roomsily household onboarding",
}

export default function OnboardingPage() {
  return (
    <>
      <div className="container relative mx-auto grid h-[640px] grid-cols-1 flex-col items-center justify-center lg:max-w-none lg:px-0">
        <SmartLink
          href="/auth"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "absolute right-4 top-4 md:right-8 md:top-8"
          )}
        >
          Login
        </SmartLink>
        <div className="lg:p-8">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            <div className="flex flex-col space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">
                Create an account
              </h1>
              <p className="text-sm text-muted-foreground">
                Enter your email below to create your account
              </p>
            </div>
            <AuthFormLegacy />
            <p className="px-8 text-center text-sm text-muted-foreground">
              By clicking continue, you agree to our{" "}
              <SmartLink
                href="#"
                className="underline underline-offset-4 hover:text-primary"
              >
                Terms of Service
              </SmartLink>{" "}
              and{" "}
              <SmartLink
                href="#"
                className="underline underline-offset-4 hover:text-primary"
              >
                Privacy Policy
              </SmartLink>
              .
            </p>
          </div>
          <div className="mt-10 max-w-3xl">
            <TenantOnboardingForm />
          </div>
        </div>
      </div>
    </>
  )
}