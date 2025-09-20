import { redirect } from "next/navigation";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupbaseServerClient } from "@/utils/supaone";

import {
  ensureRealtimeSubscription,
  fetchPropertyDirectory,
  fetchTenantMessages,
  fetchTenantThreads,
  fetchUserProfile,
} from "./actions";
import { isStaffRole } from "./roles";
import MessageBoardClient from "./message-board-client";

const PAGE_SIZE = 25;

type MessageBoardPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function MessageBoardPage({ searchParams }: MessageBoardPageProps) {
  const supabase = await createSupbaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const profile = await fetchUserProfile();
  const isStaffMember = isStaffRole(profile.role ?? null);

  const threads = isStaffMember
    ? (await fetchPropertyDirectory()).flatMap((property) => {
        const timestamp = new Date().toISOString();
        const propertyInfo = {
          id: property.id,
          name: property.name ?? "",
          address_line: property.address_line ?? null,
          city: property.city ?? null,
          state: property.state ?? null,
          postal_code: property.postal_code ?? null,
        };

        const propertyThread = {
          id: property.id,
          role: profile.role ?? "staff",
          created_at: timestamp,
          property: propertyInfo,
          unit: null,
        };

        const unitThreads = property.units.map((unit) => ({
          id: `${property.id}:${unit.id}`,
          role: profile.role ?? "staff",
          created_at: timestamp,
          property: propertyInfo,
          unit: {
            id: unit.id,
            label: unit.label ?? "",
          },
        }));

        return [propertyThread, ...unitThreads];
      })
    : await fetchTenantThreads();

  if (!threads.length) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Message board</CardTitle>
            <CardDescription>
              We couldn&apos;t find any properties associated with your account yet. Once a
              property manager connects you to a residence you&apos;ll be able to view and join
              conversations here.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const requestedProperty = searchParams?.property;
  const requestedUnit = searchParams?.unit;

  const resolvedPropertyId =
    typeof requestedProperty === "string" &&
    threads.some((thread) => thread.property?.id === requestedProperty)
      ? requestedProperty
      : threads[0]?.property?.id ?? threads[0]?.id;

  const selectedThread = threads.find((thread) => thread.property?.id === resolvedPropertyId);

  const resolvedUnitId =
    typeof requestedUnit === "string" && selectedThread?.unit?.id === requestedUnit
      ? requestedUnit
      : selectedThread?.unit?.id ?? null;

  await ensureRealtimeSubscription({ propertyId: resolvedPropertyId, unitId: resolvedUnitId });

  const messagePage = await fetchTenantMessages({
    propertyId: resolvedPropertyId,
    unitId: resolvedUnitId,
    limit: PAGE_SIZE,
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-8">
      <MessageBoardClient
        currentProfile={profile}
        initialMessages={messagePage.messages}
        initialCursor={messagePage.nextCursor}
        initialHasMore={messagePage.hasMore}
        initialPropertyId={resolvedPropertyId}
        initialUnitId={resolvedUnitId}
        threads={threads}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
