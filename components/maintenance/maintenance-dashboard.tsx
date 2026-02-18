"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { fetchMemberProfile } from "@/lib/data/members";
import { createClient } from "@/utils/supabase-browser";
import type { Database } from "@/lib/supabase";
import { MaintenanceRequestForm } from "@/components/maintenance/maintenance-request-form";
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client";

type MaintenanceRequestRow = Database["public"]["Tables"]["maintenance_requests"]["Row"];
type MaintenanceUpdateRow = Database["public"]["Tables"]["maintenance_request_updates"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

type RequestWithRequester = MaintenanceRequestRow & {
  requester: Pick<ProfileRow, "id" | "email" | "full_name"> | null;
};

type UpdateWithActor = MaintenanceUpdateRow & {
  actor: Pick<ProfileRow, "id" | "email" | "full_name"> | null;
  assignee: Pick<ProfileRow, "id" | "email" | "full_name"> | null;
};

const statusOptions = ["pending", "in_progress", "completed", "cancelled"] as const;
const priorityOptions = ["low", "normal", "high", "urgent"] as const;

const ManagerEditor = dynamic(() => import("@/components/maintenance/manager-editor").then((mod) => mod.ManagerEditor), {
  loading: () => <p className="text-sm text-muted-foreground">Loading manager controls…</p>,
});

function getSlaBucket(createdAt: string | null) {
  if (!createdAt) return "unknown";

  const ageMs = Date.now() - new Date(createdAt).getTime();
  const dayMs = 1000 * 60 * 60 * 24;
  const ageDays = ageMs / dayMs;

  if (ageDays < 2) return "0-2 days";
  if (ageDays < 5) return "3-5 days";
  if (ageDays < 8) return "6-8 days";

  return "9+ days";
}

function describeSlaHealth(request: MaintenanceRequestRow) {
  if (!request.sla_due_at || request.status === "completed") {
    return { label: "On track", tone: "secondary" as const };
  }

  const hoursUntilDue = (new Date(request.sla_due_at).getTime() - Date.now()) / (1000 * 60 * 60);

  if (hoursUntilDue < 0) return { label: "SLA breached", tone: "destructive" as const };
  if (hoursUntilDue < 12) return { label: "Due soon", tone: "outline" as const };
  return { label: "On track", tone: "secondary" as const };
}

export function MaintenanceDashboard() {
  const supabase = createClient();
  const typedSupabase = supabase as unknown as TypedSupabaseClient;
  const { toast } = useToast();

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Pick<ProfileRow, "id" | "role" | "unit_id"> | null>(null);
  const [requests, setRequests] = useState<RequestWithRequester[]>([]);
  const [updates, setUpdates] = useState<UpdateWithActor[]>([]);
  const [managers, setManagers] = useState<Pick<ProfileRow, "id" | "full_name" | "email">[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [unitFilter, setUnitFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [agingFilter, setAgingFilter] = useState("all");

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) {
        setProfile(null);
        setUserId(null);
        setRequests([]);
        setUpdates([]);
        return;
      }

      setUserId(user.id);

      const memberProfile = await fetchMemberProfile(typedSupabase, user.id);
      if (!memberProfile) throw new Error("Unable to load your profile.");
      setProfile(memberProfile);

      const isManager = memberProfile.role === "property_manager" || memberProfile.role === "admin";
      const requestQuery = (supabase as any)
        .from("maintenance_requests")
        .select("id, title, description, status, priority, requested_by, assigned_to, property_label, unit_label, created_at, sla_due_at, acknowledged_at, resolved_at, completed_at, requester:profiles!maintenance_requests_requested_by_fkey(id, email, full_name)")
        .order("created_at", { ascending: false })
        .limit(120);

      const { data: requestData, error: requestError } = isManager
        ? await requestQuery
        : await requestQuery.eq("requested_by", user.id);

      if (requestError) throw requestError;

      const normalizedRequests = (requestData ?? []) as RequestWithRequester[];
      setRequests(normalizedRequests);

      const requestIds = normalizedRequests.map((row) => row.id);
      if (!requestIds.length) {
        setUpdates([]);
      } else {
        const { data: updatesData, error: updatesError } = await (supabase as any)
          .from("maintenance_request_updates")
          .select("id, request_id, event_type, previous_status, next_status, previous_priority, next_priority, assignee_id, message, created_at, actor:profiles!maintenance_request_updates_actor_id_fkey(id, email, full_name), assignee:profiles!maintenance_request_updates_assignee_id_fkey(id, email, full_name)")
          .in("request_id", requestIds)
          .order("created_at", { ascending: false })
          .limit(300);

        if (updatesError) throw updatesError;
        setUpdates((updatesData ?? []) as UpdateWithActor[]);
      }

      if (isManager) {
        const { data: managerData, error: managerError } = await (supabase as any)
          .from("profiles")
          .select("id, full_name, email")
          .in("role", ["property_manager", "admin"])
          .order("full_name", { ascending: true })
          .limit(100);

        if (managerError) throw managerError;
        setManagers((managerData ?? []) as Pick<ProfileRow, "id" | "full_name" | "email">[]);
      } else {
        setManagers([]);
      }
    } catch (error) {
      console.error("Failed loading maintenance data", error);
      toast({
        title: "Unable to load maintenance requests",
        description: error instanceof Error ? error.message : "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [supabase, toast, typedSupabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const isManager = profile?.role === "property_manager" || profile?.role === "admin";

  const selectedRequest = useMemo(
    () => requests.find((request) => request.id === selectedRequestId) ?? null,
    [requests, selectedRequestId]
  );

  const requestUpdates = useMemo(() => {
    if (!selectedRequestId) return [];
    return updates.filter((update) => update.request_id === selectedRequestId);
  }, [selectedRequestId, updates]);

  const propertyOptions = useMemo(
    () => Array.from(new Set(requests.map((request) => request.property_label).filter(Boolean))) as string[],
    [requests]
  );

  const unitOptions = useMemo(
    () => Array.from(new Set(requests.map((request) => request.unit_label).filter(Boolean))) as string[],
    [requests]
  );

  const filteredManagerRequests = useMemo(() => {
    return requests.filter((request) => {
      const matchesSearch =
        !search ||
        request.title.toLowerCase().includes(search.toLowerCase()) ||
        request.description.toLowerCase().includes(search.toLowerCase());
      const matchesProperty = propertyFilter === "all" || request.property_label === propertyFilter;
      const matchesUnit = unitFilter === "all" || request.unit_label === unitFilter;
      const matchesStatus = statusFilter === "all" || request.status === statusFilter;
      const matchesAssignee = assigneeFilter === "all" || request.assigned_to === assigneeFilter;
      const matchesAging = agingFilter === "all" || getSlaBucket(request.created_at) === agingFilter;

      return matchesSearch && matchesProperty && matchesUnit && matchesStatus && matchesAssignee && matchesAging;
    });
  }, [requests, search, propertyFilter, unitFilter, statusFilter, assigneeFilter, agingFilter]);

  const visibleTenantRequests = useMemo(() => {
    if (!userId) return [];
    return requests.filter((request) => request.requested_by === userId);
  }, [requests, userId]);

  const pushTimelineEvent = useCallback(
    async (
      requestId: string,
      payload: {
        event_type: MaintenanceUpdateRow["event_type"];
        previous_status?: string | null;
        next_status?: string | null;
        previous_priority?: string | null;
        next_priority?: string | null;
        assignee_id?: string | null;
        message?: string;
      }
    ) => {
      if (!userId) return;
      const { error } = await (supabase as any).from("maintenance_request_updates").insert({
        request_id: requestId,
        actor_id: userId,
        ...payload,
      });
      if (error) throw error;
    },
    [supabase, userId]
  );

  const createNotification = useCallback(
    async (recipientId: string | null | undefined, title: string, message: string) => {
      if (!recipientId) return;
      await (supabase as any).from("notifications").insert({
        user_id: recipientId,
        title,
        message,
        type: "info",
      });
    },
    [supabase]
  );

  const updateRequest = useCallback(
    async (
      request: RequestWithRequester,
      changes: Partial<MaintenanceRequestRow>,
      comment?: string
    ) => {
      setSaving(true);
      try {
        const previousStatus = request.status;
        const previousPriority = request.priority;

        const { data: updated, error } = await (supabase as any)
          .from("maintenance_requests")
          .update(changes)
          .eq("id", request.id)
          .select("*")
          .single();

        if (error) throw error;

        if (changes.status && changes.status !== previousStatus) {
          await pushTimelineEvent(request.id, {
            event_type: changes.status === "completed" ? "resolved" : "status_changed",
            previous_status: previousStatus,
            next_status: changes.status,
            message: comment,
          });
          await createNotification(
            request.requested_by,
            `Maintenance request is now ${changes.status.replace("_", " ")}`,
            `${request.title} moved from ${previousStatus.replace("_", " ")} to ${changes.status.replace("_", " ")}.`
          );
        }

        if (changes.priority && changes.priority !== previousPriority) {
          await pushTimelineEvent(request.id, {
            event_type: "priority_changed",
            previous_priority: previousPriority,
            next_priority: changes.priority,
            message: comment,
          });
        }

        if (changes.assigned_to && changes.assigned_to !== request.assigned_to) {
          await pushTimelineEvent(request.id, {
            event_type: "assigned",
            assignee_id: changes.assigned_to,
            message: comment,
          });
          await createNotification(
            changes.assigned_to,
            "New maintenance assignment",
            `You were assigned request: ${request.title}`
          );
        }

        if (comment && !changes.status && !changes.priority && !changes.assigned_to) {
          await pushTimelineEvent(request.id, {
            event_type: "comment",
            message: comment,
          });
        }

        setRequests((prev) => prev.map((row) => (row.id === request.id ? { ...row, ...(updated as MaintenanceRequestRow) } : row)));
        await loadData();
      } catch (error) {
        toast({
          title: "Unable to update request",
          description: error instanceof Error ? error.message : "Unexpected error",
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
    },
    [createNotification, loadData, pushTimelineEvent, supabase, toast]
  );

  return (
    <Tabs defaultValue="tenant" className="space-y-6">
      <TabsList>
        <TabsTrigger value="tenant">Tenant view</TabsTrigger>
        {isManager ? <TabsTrigger value="manager">Manager triage</TabsTrigger> : null}
      </TabsList>

      <TabsContent value="tenant" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Submit maintenance request</CardTitle>
            <CardDescription>
              Include category, severity, preferred access times, and optional media attachments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MaintenanceRequestForm onSubmitted={loadData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your maintenance timeline</CardTitle>
            <CardDescription>Track progress and SLA state for each open request.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? <p className="text-sm text-muted-foreground">Loading requests…</p> : null}
            {!loading && !visibleTenantRequests.length ? (
              <p className="text-sm text-muted-foreground">No maintenance requests yet.</p>
            ) : null}

            {visibleTenantRequests.map((request) => {
              const requestTimeline = updates.filter((entry) => entry.request_id === request.id);
              const sla = describeSlaHealth(request);

              return (
                <div key={request.id} className="rounded-lg border p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <p className="font-medium">{request.title}</p>
                    <Badge variant="outline">{request.status.replace("_", " ")}</Badge>
                    <Badge variant="secondary">{request.priority}</Badge>
                    <Badge variant={sla.tone}>{sla.label}</Badge>
                  </div>
                  <div className="space-y-2">
                    {requestTimeline.length ? (
                      requestTimeline.slice(0, 5).map((event) => (
                        <div key={event.id} className="text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">{event.event_type.replace("_", " ")}</span>
                          {event.message ? ` — ${event.message}` : ""}
                          {event.created_at ? ` (${formatDistanceToNowStrict(new Date(event.created_at), { addSuffix: true })})` : ""}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No timeline events yet.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </TabsContent>

      {isManager ? (
        <TabsContent value="manager" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Search and filter queue</CardTitle>
              <CardDescription>
                Filter by property, unit, status, assignee, and aging buckets to prioritize triage.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <Input placeholder="Search title or description" value={search} onChange={(event) => setSearch(event.target.value)} />

              <Select value={propertyFilter} onValueChange={setPropertyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Property" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All properties</SelectItem>
                  {propertyOptions.map((property) => (
                    <SelectItem key={property} value={property}>
                      {property}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={unitFilter} onValueChange={setUnitFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All units</SelectItem>
                  {unitOptions.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All assignees</SelectItem>
                  {managers.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.full_name ?? manager.email ?? "Unknown"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={agingFilter} onValueChange={setAgingFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Aging bucket" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All aging buckets</SelectItem>
                  {["0-2 days", "3-5 days", "6-8 days", "9+ days"].map((bucket) => (
                    <SelectItem key={bucket} value={bucket}>
                      {bucket}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-[1fr,1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Triage queue</CardTitle>
                <CardDescription>{filteredManagerRequests.length} matching requests</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredManagerRequests.map((request) => (
                  <button
                    key={request.id}
                    type="button"
                    className={`w-full rounded-lg border p-3 text-left transition ${selectedRequestId === request.id ? "border-primary" : ""}`}
                    onClick={() => setSelectedRequestId(request.id)}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{request.title}</p>
                      <Badge variant="outline">{request.status.replace("_", " ")}</Badge>
                      <Badge variant="secondary">{request.priority}</Badge>
                      <Badge variant="outline">{getSlaBucket(request.created_at)}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{request.property_label ?? "Property n/a"} • {request.unit_label ?? "Unit n/a"}</p>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Assignment and status</CardTitle>
                <CardDescription>Assign, reprioritize, and move requests across lifecycle states.</CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedRequest ? (
                  <p className="text-sm text-muted-foreground">Select a request to begin triage.</p>
                ) : (
                  <ManagerEditor
                    request={selectedRequest}
                    managers={managers}
                    disabled={saving}
                    onSave={(changes, comment) => updateRequest(selectedRequest, changes, comment)}
                    updates={requestUpdates}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      ) : null}
    </Tabs>
  );
}
