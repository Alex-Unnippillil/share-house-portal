import { NextResponse } from "next/server"

import {
  runChoreEscalationJob,
  SupabaseChoreEscalationNotificationService,
  SupabaseChoreEscalationRepository,
} from "@/lib/jobs/chore-escalation"
import { createServiceRoleClient } from "@/utils/supabase/service-role-client"

export async function GET() {
  const client = createServiceRoleClient()
  const repository = new SupabaseChoreEscalationRepository(client)
  const notifications = new SupabaseChoreEscalationNotificationService(client)

  const result = await runChoreEscalationJob({
    repository,
    notifications,
  })

  return NextResponse.json({
    ok: true,
    ...result,
  })
}
