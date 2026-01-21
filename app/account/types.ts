import type { Database } from "@/lib/supabase"

export type DigestFrequency =
  Database["public"]["Tables"]["profiles"]["Row"]["digest_frequency"]

export interface AccountProfile {
  fullName: string | null
  username: string | null
  website: string | null
  avatarUrl: string | null
  email: string | null
  digestFrequency: DigestFrequency
  quietHoursStart: string | null
  quietHoursEnd: string | null
}
