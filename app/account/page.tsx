
import { Separator } from "@/components/ui/separator"
import AccountForm from "./supa-account-form"
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supa-server-actions'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function SettingsAccountPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)  


  const { 
data: { user },} = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth')
  }

  return (
    <div className="mt-10 px-2 lg:p-8">
    <div className="mx-auto flex w-full flex-col justify-center space-y-6 px-2">
<div className="text-justified-center items-justified-center flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">Account Profile</h1>
        <p className="text-justify text-base ">
          Update your account...</p>

        <Link
          href="/amenities"
          target="_blank"
          rel="noreferrer"
          className="text-1xl font-bold tracking-tighter sm:text-3xl"
        >
         Preview everything that’s included in your home
        </Link>
       </div>
      <Separator />
      <AccountForm user={user}/>
    </div>
   </div>
  )
}