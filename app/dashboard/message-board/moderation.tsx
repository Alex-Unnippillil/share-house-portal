import { redirect } from "next/navigation";

import {
  fetchPropertyDirectory,
  fetchTenantMessages,
  fetchUserProfile,
} from "@/app/(tenant)/message-board/actions";
import { isStaffRole } from "@/app/(tenant)/message-board/roles";

import ModerationClient from "./moderation-client";

const PAGE_SIZE = 40;

type ModerationPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function ModerationPage({ searchParams }: ModerationPageProps) {
  let profile;
  try {
    profile = await fetchUserProfile();
  } catch (error) {
    if (error instanceof Error && error.message === "Not authenticated") {
      redirect("/auth");
    }

    throw error;
  }

  if (!isStaffRole(profile.role ?? null)) {
    redirect("/dashboard");
  }

  const properties = (await fetchPropertyDirectory()).map(({ units, ...summary }) => summary);

  if (!properties.length) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-12">
        <div className="rounded-md border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          No properties are configured yet. Create a property to begin moderating tenant
          conversations.
        </div>
      </div>
    );
  }

  const requestedProperty = searchParams?.property;
  const propertyIds = properties.map((property) => property.id);
  const selectedPropertyId =
    typeof requestedProperty === "string" && propertyIds.includes(requestedProperty)
      ? requestedProperty
      : properties[0]!.id;

  const messagePage = await fetchTenantMessages({
    propertyId: selectedPropertyId,
    limit: PAGE_SIZE,
    includePropertyMeta: true,
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 py-8">
      <ModerationClient
        currentProfile={profile}
        properties={properties}
        initialPropertyId={selectedPropertyId}
        initialMessages={messagePage.messages}
        initialCursor={messagePage.nextCursor}
        initialHasMore={messagePage.hasMore}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
