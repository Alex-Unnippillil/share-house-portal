import { NextResponse } from "next/server";

import { createSupbaseServerClient } from "@/utils/supaone";
import { createVisitorRequest, type CreateVisitorRequestInput } from "@/lib/visitor-requests";

export async function POST(request: Request) {
  const client = await createSupbaseServerClient();
  const body = await request.json().catch(() => null);

  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const payload = { ...(body as Record<string, unknown>), actorId: user.id } as CreateVisitorRequestInput;
    const result = await createVisitorRequest(client, payload);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create visitor request.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
