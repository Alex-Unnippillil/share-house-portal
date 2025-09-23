"use server"

import { revalidatePath } from "next/cache"
import { cookies, headers } from "next/headers"
import { createClient } from "@/utils/supa-server-actions"
import { getLogger, withRequestContext } from "@/lib/logger"

type formData = {
  name: string
  email: string
  message: string
}

export async function submitInquiry(data: formData) {
  const requestHeaders = headers()
  const log = getLogger({ module: "contact.submitInquiry" })

  return withRequestContext(
    async () => {
      const cookieStore = cookies()
      const supabase = createClient(cookieStore)

      try {
        const { error } = await supabase.from("inquiries").insert([
          {
            name: data.name,
            email: data.email,
            message: data.message,
          },
        ])

        if (error) throw error

        revalidatePath("/contact")
        return { success: true, message: "Message sent successfully!" }
      } catch (error) {
        log.error({ err: error, inquiry: data }, "Error submitting inquiry")
        return {
          success: false,
          message: "Error sending message. Please try again.",
        }
      }
    },
    { headers: requestHeaders }
  )
}
