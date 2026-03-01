import React from "react";
import SmartLink from "@/components/navigation/SmartLink"
import { siteConfig } from '@/config/site'
import { Icons } from '@/components/icons'
import { cookies } from 'next/headers'
import { Contact } from "@/components/forms/contact";
import { createClient } from "@/utils/supa-server-actions";
import { redirect } from "next/navigation";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { type User } from '@supabase/supabase-js'

export default async function ContactPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)  


  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect('/auth')
  }


         return (
                        <div className="mt-10 px-2 lg:p-8">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            <div className="flex flex-col items-center space-y-2 text-center">
      <SmartLink href="/auth" className="mb-8 inline-flex">
        <span className="flex items-center space-x-2">
          <Icons.logo className="size-6" />
          <span className="inline-block font-bold">{siteConfig.name}</span>
        </span>
      </SmartLink>
              <h1 className="text-2xl font-semibold tracking-tight">
                Contact Us
              </h1>
              <p className="text-sm text-muted-foreground">
                Need help with the Share House Portal? Reach Alex Unni at{" "}
                <a
                  className="font-medium underline"
                  href="mailto:alex@myunni.com"
                >
                  alex@myunni.com
                </a>{" "}
                or call{" "}
                <a
                  className="font-medium underline"
                  href="tel:+14167063586"
                >
                  +1-416-706-3586
                </a>
                .
              </p>
            </div>
                        <Contact/>
                </div>
               </div>
        );



  }