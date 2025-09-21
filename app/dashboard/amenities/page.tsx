import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createServerClient } from "@supabase/ssr"

import type { Database } from "@/lib/supabase"
import { AmenitiesClient } from "./_components/amenities-client"

export default async function AmenitiesPage() {
  const cookieStore = cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth")
  }

  const { data: amenities, error } = await supabase
    .from("amenities")
    .select(
      "id, name, slug, description, calcom_event_slug, calcom_event_type_id, building_id, unit_id, created_at, updated_at"
    )
    .order("name", { ascending: true })

  if (error) {
    throw new Error("Unable to load amenities")
  }

  return <AmenitiesClient amenities={amenities ?? []} userId={user.id} />
}
