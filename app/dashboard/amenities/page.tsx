import { Metadata } from "next"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createSupbaseServerClient } from "@/utils/supaone"
import type { Database } from "@/lib/supabase"

import { AmenityEventTypeForm } from "./amenity-event-type-form"

export const metadata: Metadata = {
  title: "Amenity event types",
  description: "Manage Cal.com event types that power shared amenity scheduling.",
}

type Amenity = Database["public"]["Tables"]["amenities"]["Row"]

export default async function AmenitiesPage() {
  const supabase = await createSupbaseServerClient()
  const { data: amenities, error } = await supabase
    .from("amenities")
    .select("*")
    .order("name", { ascending: true })

  if (error) {
    console.error("Failed to load amenities", error)
    throw new Error("Unable to load amenities")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Amenity scheduling</h1>
        <p className="text-muted-foreground">
          Create and maintain the Cal.com event types that residents book for each shared amenity.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Cal.com event type mapping</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {amenities && amenities.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] table-auto border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 pr-4">Amenity</th>
                    <th className="py-3 pr-4">Slug</th>
                    <th className="py-3 pr-4">Current event type ID</th>
                    <th className="py-3 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {amenities.map((amenity) => (
                    <AmenityRow key={amenity.id} amenity={amenity} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No amenities have been configured yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function AmenityRow({ amenity }: { amenity: Amenity }) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-4 pr-4 align-top">
        <div className="font-medium">{amenity.name}</div>
        {amenity.description ? (
          <p className="text-sm text-muted-foreground">{amenity.description}</p>
        ) : null}
      </td>
      <td className="py-4 pr-4 align-top text-muted-foreground">{amenity.slug}</td>
      <td className="py-4 pr-4 align-top text-muted-foreground">
        {amenity.calcom_event_type_id ? `#${amenity.calcom_event_type_id}` : "Not linked"}
      </td>
      <td className="py-4 pr-4 align-top">
        <AmenityEventTypeForm
          amenityId={amenity.id}
          defaultEventTypeId={amenity.calcom_event_type_id}
          defaultEventTypeSlug={amenity.calcom_event_type_slug}
        />
      </td>
    </tr>
  )
}
