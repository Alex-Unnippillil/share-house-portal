"use server";

import { createClient } from "@/utils/supa-server-actions";
import { revalidatePath } from "next/cache";
import { cookies } from 'next/headers';

type formData = {
    name: string;
    email: string;
    message: string;
}

export async function submitInquiry(data: formData) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    const { error } = await supabase
      .from('inquiries')
      .insert({
        name: data.name,
        email: data.email,
        message: data.message
      } as any);

    if (error) throw error;

    revalidatePath('/contact');
    return { success: true, message: 'Message sent successfully!' };
  } catch (error) {
    console.error('Error submitting inquiry:', error);
    return { success: false, message: 'Error sending message. Please try again.' };
  }
}