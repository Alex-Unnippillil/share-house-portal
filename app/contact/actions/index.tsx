"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { createClient } from "@/utils/supa-server-actions"

type formData = {
  name: string
  email: string
  message: string
}

export async function submitInquiry(data: formData) {
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

    revalidatePath("/support")
    return { success: true, message: "Message sent successfully!" }
  } catch (error) {
    console.error("Error submitting inquiry:", error)
    return {
      success: false,
      message: "Error sending message. Please try again.",
    }
  }
}
