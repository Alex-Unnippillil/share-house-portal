import { NextResponse } from "next/server";

import { overrideVisitorRequestStatus, type OverrideStatus } from "@/lib/visitor-requests";
import { createSupbaseServerClient } from "@/utils/supaone";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const client = await createSupbaseServerClient();
  const body = await request.json().catch(() => null);

  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!params?.id) {
    return NextResponse.json({ error: "Missing request identifier" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { status, reason } = body as { status?: string; reason?: string };

  if (status !== "approved" && status !== "denied") {
    return NextResponse.json({ error: "Unsupported status override" }, { status: 400 });
  }

  try {
    const updated = await overrideVisitorRequestStatus(client, {
      requestId: params.id,
      nextStatus: status as OverrideStatus,
      actorId: user.id,
      reason,
    });

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to override request";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
