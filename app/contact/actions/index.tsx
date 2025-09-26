"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { createClient } from "@/utils/supa-server-actions"
import { verifyCsrfToken } from "@/utils/csrf"

type formData = {
  name: string
  email: string
  message: string
  csrfToken: string
}

export async function submitInquiry(data: formData) {
  const cookieStore = cookies()
  if (!verifyCsrfToken(cookieStore, data.csrfToken)) {
    return {
      success: false,
      message: "Invalid CSRF token.",
      status: 403,
    }
  }

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
    console.error("Error submitting inquiry:", error)
    return {
      success: false,
      message: "Error sending message. Please try again.",
    }
  }
}
