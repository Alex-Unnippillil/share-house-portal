import Link from "next/link"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createSupbaseServerClient } from "@/utils/supaone"

export default async function FloorplansPage() {
  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("id, role, full_name")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null }

  const { data: floorplans } = await supabase
    .from("floorplans")
    .select("id, name, image_url, description, created_at")
    .order("created_at", { ascending: true })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Floorplans</h1>
        <p className="text-muted-foreground">
          Manage overlays for each property floorplan and review the areas assigned to
          individual tenants.
        </p>
        {profile?.role !== "admin" ? (
          <Badge variant="secondary" className="w-fit">
            You are viewing tenant mode. Editing tools are hidden.
          </Badge>
        ) : null}
      </div>
      {floorplans && floorplans.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {floorplans.map((floorplan) => (
            <Card key={floorplan.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{floorplan.name}</CardTitle>
                {floorplan.description ? (
                  <CardDescription>{floorplan.description}</CardDescription>
                ) : null}
              </CardHeader>
              <CardContent className="flex-1">
                <div className="aspect-[4/3] overflow-hidden rounded-md border">
                  <img
                    src={floorplan.image_url}
                    alt={floorplan.name}
                    className="size-full object-cover"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Link
                  href={`/dashboard/floorplans/${floorplan.id}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {profile?.role === "admin" ? "Open editor" : "View assignments"}
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No floorplans yet</CardTitle>
            <CardDescription>
              Create a floorplan record in Supabase to begin annotating shared spaces.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}
