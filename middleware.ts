import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase";
import {
  matchRoute,
  selectActiveMembership,
  hasRequiredRole,
  type MembershipSummary,
} from "@/lib/authz/guards";

const REDIRECT_BASE = "/dashboard";

type CookieChange = {
  name: string;
  value: string;
  options: CookieOptions;
};

function buildUnauthorizedResponse(
  request: NextRequest,
  reason: "auth" | "membership" | "role"
): NextResponse {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const status = reason === "auth" ? 401 : 403;
    return new NextResponse(
      JSON.stringify({ error: "forbidden", reason }),
      {
        status,
        headers: { "content-type": "application/json" },
      }
    );
  }

  const redirectUrl = new URL(
    reason === "auth" ? "/auth" : REDIRECT_BASE,
    request.url
  );

  if (reason === "auth") {
    redirectUrl.searchParams.set(
      "redirect_to",
      `${request.nextUrl.pathname}${request.nextUrl.search}`
    );
  } else {
    redirectUrl.searchParams.set("error", reason);
  }

  return NextResponse.redirect(redirectUrl);
}

export async function middleware(request: NextRequest) {
  const cookieChanges: CookieChange[] = [];
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieChanges.push({ name, value, options });
          request.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieChanges.push({ name, value: "", options });
          request.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const routeMatch = matchRoute(request.nextUrl.pathname, request.method);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let memberships: MembershipSummary[] = [];

  if (user) {
    const { data } = await supabase
      .from("building_memberships")
      .select("building_id, role, is_primary")
      .eq("user_id", user.id);

    memberships = (data ?? []).map((membership) => ({
      building_id: membership.building_id,
      role: membership.role,
      is_primary: membership.is_primary ?? false,
    }));
  }

  const headerBuildingId = request.headers.get("x-building-id");
  const queryBuildingId = request.nextUrl.searchParams.get("buildingId");
  const pathBuildingId =
    routeMatch && routeMatch.guard.buildingMatchIndex
      ? routeMatch.match[routeMatch.guard.buildingMatchIndex] ?? null
      : null;

  const requestedBuildingId =
    headerBuildingId ?? pathBuildingId ?? queryBuildingId ?? null;

  const activeMembership = selectActiveMembership(
    memberships,
    requestedBuildingId
  );
  const scopedBuildingId =
    pathBuildingId ?? activeMembership?.building_id ?? requestedBuildingId ?? null;

  if (routeMatch) {
    if (routeMatch.guard.requireAuth && !user) {
      return buildUnauthorizedResponse(request, "auth");
    }

    if (routeMatch.guard.requireMembership && (!user || memberships.length === 0)) {
      return buildUnauthorizedResponse(request, "membership");
    }

    if (
      routeMatch.guard.requireMembership &&
      !hasRequiredRole(routeMatch.guard, memberships, scopedBuildingId)
    ) {
      return buildUnauthorizedResponse(request, "role");
    }
  }

  const requestHeaders = new Headers(request.headers);
  if (activeMembership) {
    requestHeaders.set("x-active-building-id", activeMembership.building_id);
    requestHeaders.set("x-active-role", activeMembership.role);
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  for (const change of cookieChanges) {
    response.cookies.set({
      name: change.name,
      value: change.value,
      ...change.options,
    });
  }

  if (activeMembership) {
    response.cookies.set({
      name: "active_building_id",
      value: activeMembership.building_id,
      path: "/",
      sameSite: "lax",
    });
    response.cookies.set({
      name: "active_role",
      value: activeMembership.role,
      path: "/",
      sameSite: "lax",
    });
  } else {
    response.cookies.delete("active_building_id");
    response.cookies.delete("active_role");
  }

  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
