"use server";

import { revalidatePath } from "next/cache";

import type { Json, Tables } from "@/lib/supabase";
import { createSupbaseServerClient, createSupbaseServerClientReadOnly } from "@/utils/supaone";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type TenantMessageAttachment = {
  name: string;
  url: string;
  type?: string | null;
};

export type TenantThread = {
  id: string;
  role: string;
  property: {
    id: string;
    name: string;
    address_line: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
  } | null;
  unit: {
    id: string;
    label: string;
  } | null;
  created_at: string;
};

type MinimalProfile = Pick<
  Tables<"profiles">,
  "id" | "full_name" | "avatar_url" | "role"
>;

export type TenantMessageRecord = Omit<
  Tables<"tenant_messages">,
  "attachments"
> & {
  attachments: TenantMessageAttachment[];
  author: MinimalProfile | null;
  property?: Pick<Tables<"properties">, "id" | "name"> | null;
  unit?: Pick<Tables<"property_units">, "id" | "label"> | null;
};

type TenantMessageRow = Tables<"tenant_messages"> & {
  author: MinimalProfile | null;
  property?: Pick<Tables<"properties">, "id" | "name"> | null;
  unit?: Pick<Tables<"property_units">, "id" | "label"> | null;
};

type TenantMessagePage = {
  messages: TenantMessageRecord[];
  nextCursor: string | null;
  hasMore: boolean;
};

const globalRealtimeStore = globalThis as unknown as {
  __tenantMessageChannels?: Map<string, RealtimeChannel>;
};

if (!globalRealtimeStore.__tenantMessageChannels) {
  globalRealtimeStore.__tenantMessageChannels = new Map();
}

const channelRegistry = globalRealtimeStore.__tenantMessageChannels;

const THREAD_SELECT = `
  id,
  role,
  created_at,
  property:properties(
    id,
    name,
    address_line,
    city,
    state,
    postal_code
  ),
  unit:property_units(
    id,
    label
  )
`;

function parseAttachments(payload: Json | null): TenantMessageAttachment[] {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    const attachments: TenantMessageAttachment[] = [];

    payload.forEach((item) => {
      if (!item || typeof item !== "object") {
        return;
      }

      const typed = item as Record<string, unknown>;
      const url = typeof typed.url === "string" ? typed.url : null;

      if (!url) {
        return;
      }

      attachments.push({
        url,
        name:
          typeof typed.name === "string" && typed.name.trim().length > 0
            ? typed.name
            : "Attachment",
        type: typeof typed.type === "string" ? typed.type : null,
      });
    });

    return attachments;
  }

  return [];
}

function mapTenantMessage(row: TenantMessageRow): TenantMessageRecord {
  return {
    ...row,
    attachments: parseAttachments(row.attachments as Json),
    author: row.author ?? null,
    property: row.property ?? null,
    unit: row.unit ?? null,
  };
}

export async function fetchTenantThreads(): Promise<TenantThread[]> {
  const supabase = await createSupbaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("tenant_property_memberships")
    .select(THREAD_SELECT)
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((membership) => ({
    id: membership.id,
    role: membership.role ?? "tenant",
    created_at: membership.created_at,
    property: membership.property
      ? {
          id: membership.property.id,
          name: membership.property.name ?? "",
          address_line: membership.property.address_line ?? null,
          city: membership.property.city ?? null,
          state: membership.property.state ?? null,
          postal_code: membership.property.postal_code ?? null,
        }
      : null,
    unit: membership.unit
      ? {
          id: membership.unit.id,
          label: membership.unit.label ?? "",
        }
      : null,
  }));
}

export async function fetchTenantMessages(params: {
  propertyId: string;
  unitId?: string | null;
  limit?: number;
  before?: string | null;
  includePropertyMeta?: boolean;
}): Promise<TenantMessagePage> {
  const { propertyId, unitId, limit = 20, before, includePropertyMeta } = params;
  const supabase = await createSupbaseServerClient();

  const columns = [
    "*",
    "author:profiles!tenant_messages_author_id_fkey(id,full_name,avatar_url,role)",
  ];

  if (includePropertyMeta) {
    columns.push("property:properties(id,name)");
    columns.push("unit:property_units(id,label)");
  }

  let query = supabase
    .from("tenant_messages")
    .select(columns.join(","))
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (unitId) {
    query = query.or(`unit_id.is.null,unit_id.eq.${unitId}`);
  }

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const rows = Array.isArray(data)
    ? ((data as unknown) as TenantMessageRow[])
    : [];
  const hasMore = rows.length === limit;
  const nextCursor = hasMore && rows.length > 0 ? rows[rows.length - 1].created_at : null;
  const normalized = rows
    .slice()
    .reverse()
    .map((row) => mapTenantMessage(row));

  return {
    messages: normalized,
    nextCursor,
    hasMore,
  };
}

export async function getTenantMessageById(params: {
  messageId: number;
  includePropertyMeta?: boolean;
}): Promise<TenantMessageRecord | null> {
  const { messageId, includePropertyMeta } = params;
  const supabase = await createSupbaseServerClient();

  const columns = [
    "*",
    "author:profiles!tenant_messages_author_id_fkey(id,full_name,avatar_url,role)",
  ];

  if (includePropertyMeta) {
    columns.push("property:properties(id,name)");
    columns.push("unit:property_units(id,label)");
  }

  const { data, error } = await supabase
    .from("tenant_messages")
    .select(columns.join(","))
    .eq("id", messageId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapTenantMessage((data as unknown) as TenantMessageRow);
}

export async function createTenantMessage(params: {
  propertyId: string;
  unitId?: string | null;
  body: string;
  attachments?: TenantMessageAttachment[];
}): Promise<TenantMessageRecord> {
  const { propertyId, unitId, body, attachments = [] } = params;
  const supabase = await createSupbaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    throw new Error("Not authenticated");
  }

  const normalizedAttachments = attachments.map((item) => ({
    name: item.name,
    url: item.url,
    type: item.type ?? null,
  }));

  const { data, error } = await supabase
    .from("tenant_messages")
    .insert({
      property_id: propertyId,
      unit_id: unitId ?? null,
      author_id: user.id,
      body,
      attachments: normalizedAttachments,
    })
    .select(
      "*, author:profiles!tenant_messages_author_id_fkey(id,full_name,avatar_url,role), property:properties(id,name), unit:property_units(id,label)"
    )
    .single();

  if (error) {
    throw error;
  }

  revalidatePath("/message-board");
  revalidatePath("/dashboard/message-board/moderation");

  return mapTenantMessage(data as TenantMessageRow);
}

async function mutateTenantMessage(
  id: number,
  updates: Partial<Tables<"tenant_messages">>
): Promise<TenantMessageRecord> {
  const supabase = await createSupbaseServerClient();
  const { data, error } = await supabase
    .from("tenant_messages")
    .update(updates)
    .eq("id", id)
    .select(
      "*, author:profiles!tenant_messages_author_id_fkey(id,full_name,avatar_url,role), property:properties(id,name), unit:property_units(id,label)"
    )
    .single();

  if (error) {
    throw error;
  }

  revalidatePath("/message-board");
  revalidatePath("/dashboard/message-board/moderation");

  return mapTenantMessage(data as TenantMessageRow);
}

export async function pinTenantMessage(messageId: number): Promise<TenantMessageRecord> {
  const supabase = await createSupbaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    throw new Error("Not authenticated");
  }

  return mutateTenantMessage(messageId, {
    is_pinned: true,
    pinned_at: new Date().toISOString(),
    pinned_by: user.id,
  });
}

export async function unpinTenantMessage(messageId: number): Promise<TenantMessageRecord> {
  return mutateTenantMessage(messageId, {
    is_pinned: false,
    pinned_at: null,
    pinned_by: null,
  });
}

export async function removeTenantMessage(messageId: number): Promise<TenantMessageRecord> {
  const supabase = await createSupbaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    throw new Error("Not authenticated");
  }

  return mutateTenantMessage(messageId, {
    is_removed: true,
    removed_at: new Date().toISOString(),
    removed_by: user.id,
  });
}

export async function restoreTenantMessage(messageId: number): Promise<TenantMessageRecord> {
  return mutateTenantMessage(messageId, {
    is_removed: false,
    removed_at: null,
    removed_by: null,
  });
}

export async function ensureRealtimeSubscription(params: {
  propertyId: string;
  unitId?: string | null;
}): Promise<{ channel: string; filter: string }> {
  const { propertyId, unitId } = params;
  const channelKey = `${propertyId}:${unitId ?? "all"}`;

  if (channelRegistry.has(channelKey)) {
    const existing = channelRegistry.get(channelKey)!;
    return {
      channel: existing.topic,
      filter: `property_id=eq.${propertyId}`,
    };
  }

  const supabase = await createSupbaseServerClientReadOnly();

  const channel = supabase
    .channel(`tenant-messages-${channelKey}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "tenant_messages",
        filter: `property_id=eq.${propertyId}`,
      },
      async () => {
        revalidatePath("/message-board");
        revalidatePath("/dashboard/message-board/moderation");
      }
    );

  await channel.subscribe();
  channelRegistry.set(channelKey, channel);

  return {
    channel: channel.topic,
    filter: `property_id=eq.${propertyId}`,
  };
}

export async function fetchPropertyDirectory(): Promise<
  Array<
    Pick<Tables<"properties">, "id" | "name" | "address_line" | "city" | "state" | "postal_code"> & {
      units: Array<Pick<Tables<"property_units">, "id" | "label">>;
    }
  >
> {
  const supabase = await createSupbaseServerClient();
  const { data, error } = await supabase
    .from("properties")
    .select(
      "id,name,address_line,city,state,postal_code, units:property_units(id,label)"
    )
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((property) => ({
    id: property.id,
    name: property.name ?? "",
    address_line: property.address_line ?? null,
    city: property.city ?? null,
    state: property.state ?? null,
    postal_code: property.postal_code ?? null,
    units: (property.units ?? []).map((unit: { id: string; label: string | null }) => ({
      id: unit.id,
      label: unit.label ?? "",
    })),
  }));
}

export async function fetchUserProfile() {
  const supabase = await createSupbaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id,full_name,avatar_url,role")
    .eq("id", user.id)
    .single();

  if (error) {
    throw error;
  }

  return data as MinimalProfile;
}

