"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useNotifications } from "@/hooks/use-notifications";
import { createClient } from "@/utils/supabase-browser";
import { useToast } from "@/components/ui/use-toast";
import { fetchMemberProfile, fetchMembersByUnit } from "@/lib/data/members";
import {
  createMaintenanceRequestDraft,
  fetchMaintenanceRequests,
  publishMaintenanceRequest,
  unpublishMaintenanceRequest,
  type MaintenanceRequestWithVersions,
} from "@/lib/maintenance/requests";
import { cn } from "@/lib/utils";
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client";

const maintenanceRequestSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  category: z.string().optional(),
  location: z.string().optional(),
});

type MaintenanceRequestFormData = z.infer<typeof maintenanceRequestSchema>;

type PropertyManagerInfo = {
  id: string;
  email: string;
  name: string;
};

type MaintenanceRequestVersion = MaintenanceRequestWithVersions['versions'][number];

const categories = [
  "Plumbing",
  "Electrical",
  "HVAC",
  "Appliance",
  "Structural",
  "Pest Control",
  "Cleaning",
  "Security",
  "Other",
];

const priorities = [
  { value: "low", label: "Low - Nice to have" },
  { value: "normal", label: "Normal - Standard priority" },
  { value: "high", label: "High - Needs attention soon" },
  { value: "urgent", label: "Urgent - Emergency fix needed" },
];

const defaultValues: MaintenanceRequestFormData = {
  title: "",
  description: "",
  priority: "normal",
  category: "",
  location: "",
};

function formatVersionTimestamp(version: MaintenanceRequestVersion) {
  const timestamp = version.published_at ?? version.created_at;
  if (!timestamp) return "—";

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toLocaleString();
}

export function MaintenanceRequestForm() {
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [requests, setRequests] = useState<MaintenanceRequestWithVersions[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [unitId, setUnitId] = useState<string | null>(null);
  const [requesterName, setRequesterName] = useState<string>("Unknown requester");
  const [propertyManager, setPropertyManager] = useState<PropertyManagerInfo | null>(null);
  const [publishingRequestId, setPublishingRequestId] = useState<string | null>(null);
  const [unpublishingRequestId, setUnpublishingRequestId] = useState<string | null>(null);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);

  const { notifyMaintenanceRequest } = useNotifications();
  const { toast } = useToast();

  const supabase = useMemo(() => createClient(), []);
  const typedSupabase = useMemo(
    () => supabase as unknown as TypedSupabaseClient,
    [supabase],
  );

  const form = useForm<MaintenanceRequestFormData>({
    resolver: zodResolver(maintenanceRequestSchema),
    defaultValues,
  });

  const loadRequests = useCallback(
    async (targetUserId: string, targetUnitId: string | null) => {
      try {
        const result = await fetchMaintenanceRequests({
          client: typedSupabase,
          userId: targetUserId,
          unitId: targetUnitId,
        });
        setRequests(result);
      } catch (error) {
        console.error('Error fetching maintenance requests:', error);
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to load maintenance requests.",
          variant: "destructive",
        });
      }
    },
    [typedSupabase, toast],
  );

  const refreshRequests = useCallback(async () => {
    if (!userId) return;
    setIsLoadingRequests(true);
    try {
      await loadRequests(userId, unitId ?? null);
    } finally {
      setIsLoadingRequests(false);
    }
  }, [loadRequests, unitId, userId]);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      setIsLoadingRequests(true);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!isMounted) return;

        if (!user) {
          setIsLoadingRequests(false);
          toast({
            title: "Authentication required",
            description: "Please sign in to submit maintenance requests.",
            variant: "destructive",
          });
          return;
        }

        setUserId(user.id);
        setRequesterName(user.email ?? "Unknown requester");

        const profile = await fetchMemberProfile(typedSupabase, user.id);
        if (!isMounted) return;

        if (profile?.unit_id) {
          setUnitId(profile.unit_id);
          setRequesterName(profile.full_name || user.email || "Unknown requester");

          const [manager] = await fetchMembersByUnit(typedSupabase, profile.unit_id, {
            roles: ['property_manager'],
          });

          if (isMounted && manager) {
            setPropertyManager({
              id: manager.id,
              email: manager.email || '',
              name: manager.full_name || manager.email || 'Property manager',
            });
          }
        }

        await loadRequests(user.id, profile?.unit_id ?? null);
      } catch (error) {
        if (!isMounted) return;
        console.error('Error loading maintenance request context:', error);
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to initialize maintenance requests.",
          variant: "destructive",
        });
      } finally {
        if (isMounted) {
          setIsLoadingRequests(false);
        }
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, [supabase, typedSupabase, loadRequests, toast]);

  const onSubmit = async (data: MaintenanceRequestFormData) => {
    if (!userId) {
      toast({
        title: "Unable to submit",
        description: "You must be signed in to submit a maintenance request.",
        variant: "destructive",
      });
      return;
    }

    if (!unitId) {
      toast({
        title: "Missing unit",
        description: "We could not determine your assigned unit to file this request.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingDraft(true);

    try {
      const request = await createMaintenanceRequestDraft({
        client: typedSupabase,
        payload: data,
        userId,
        unitId,
      });

      setActiveRequestId(request.id);
      await refreshRequests();

      toast({
        title: "Draft saved",
        description: "Your maintenance request has been saved as a draft. Publish it when you're ready to notify your property manager.",
      });

      form.reset(defaultValues);
    } catch (error) {
      console.error('Error saving maintenance request draft:', error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save maintenance request draft.",
        variant: "destructive",
      });
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handlePublish = async (request: MaintenanceRequestWithVersions) => {
    if (!userId) {
      toast({
        title: "Publish failed",
        description: "Sign in again to publish maintenance requests.",
        variant: "destructive",
      });
      return;
    }

    if (!propertyManager) {
      toast({
        title: "No property manager found",
        description: "We couldn't find a property manager for your unit. Please contact support before publishing.",
        variant: "destructive",
      });
      return;
    }

    setPublishingRequestId(request.id);

    try {
      const updatedRequest = await publishMaintenanceRequest({
        client: typedSupabase,
        request,
        userId,
      });

      setActiveRequestId(updatedRequest.id);
      await refreshRequests();

      await notifyMaintenanceRequest({
        requesterName,
        title: updatedRequest.title,
        description: updatedRequest.description,
        priority: updatedRequest.priority,
        propertyManager,
      });

      toast({
        title: "Request published",
        description: "Your property manager has been notified about this issue.",
      });
    } catch (error) {
      console.error('Error publishing maintenance request:', error);
      toast({
        title: "Publish failed",
        description:
          error instanceof Error ? error.message : "Failed to publish maintenance request.",
        variant: "destructive",
      });
    } finally {
      setPublishingRequestId(null);
    }
  };

  const handleUnpublish = async (request: MaintenanceRequestWithVersions) => {
    if (!userId) {
      toast({
        title: "Unpublish failed",
        description: "Sign in again to manage maintenance requests.",
        variant: "destructive",
      });
      return;
    }

    setUnpublishingRequestId(request.id);

    try {
      const updatedRequest = await unpublishMaintenanceRequest({
        client: typedSupabase,
        request,
        userId,
      });

      setActiveRequestId(updatedRequest.id);
      await refreshRequests();

      toast({
        title: "Moved back to draft",
        description: "You can edit the request and publish again when ready.",
      });
    } catch (error) {
      console.error('Error unpublishing maintenance request:', error);
      toast({
        title: "Unpublish failed",
        description:
          error instanceof Error ? error.message : "Failed to unpublish maintenance request.",
        variant: "destructive",
      });
    } finally {
      setUnpublishingRequestId(null);
    }
  };

  return (
    <Form {...form}>
      <div className="space-y-8">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Issue Title *</FormLabel>
                <FormControl>
                  <Input placeholder="Brief description of the issue" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Detailed Description *</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Please provide detailed information about the issue, including when it started, what you've observed, and any steps you've taken..."
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority Level *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {priorities.map((priority) => (
                        <SelectItem key={priority.value} value={priority.value}>
                          {priority.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Kitchen, Bedroom 1, Common Area" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isSavingDraft} className="w-full">
            {isSavingDraft ? "Saving draft..." : "Save Draft"}
          </Button>
        </form>

        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold uppercase text-muted-foreground">
              Maintenance requests
            </h3>
            <p className="text-sm text-muted-foreground">
              Drafts are only visible to you until you publish them. Published requests are shared with your property manager and household.
            </p>
          </div>

          {isLoadingRequests ? (
            <p className="text-sm text-muted-foreground">Loading your maintenance requests...</p>
          ) : requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You haven't created any maintenance requests yet. Save a draft to get started.
            </p>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => {
                const isOwner = userId === request.requested_by;
                const isDraft = request.state === 'draft';
                const isPublished = request.state === 'published';
                const isPublishing = publishingRequestId === request.id;
                const isUnpublishing = unpublishingRequestId === request.id;

                return (
                  <div
                    key={request.id}
                    className={cn(
                      "space-y-3 rounded-lg border p-4",
                      activeRequestId === request.id && "border-primary"
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{request.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Priority: {request.priority} • Status: {request.status}
                        </p>
                      </div>
                      <Badge variant={isPublished ? 'default' : 'secondary'}>
                        {isPublished ? 'Published' : 'Draft'}
                      </Badge>
                    </div>

                    {request.description && (
                      <p className="text-sm text-muted-foreground">{request.description}</p>
                    )}

                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {request.location && <span>Location: {request.location}</span>}
                      {request.category && <span>Category: {request.category}</span>}
                      <span>
                        Version: v{request.version ?? request.versions[0]?.version ?? 1}
                      </span>
                    </div>

                    {isOwner && (
                      <div className="flex flex-wrap gap-2">
                        {isDraft ? (
                          <Button
                            size="sm"
                            onClick={() => handlePublish(request)}
                            disabled={isPublishing}
                          >
                            {isPublishing ? 'Publishing...' : 'Publish request'}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUnpublish(request)}
                            disabled={isUnpublishing}
                          >
                            {isUnpublishing ? 'Reverting...' : 'Unpublish to edit'}
                          </Button>
                        )}
                      </div>
                    )}

                    {request.versions.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">
                          Version history
                        </p>
                        <ul className="space-y-1">
                          {request.versions.map((version) => (
                            <li
                              key={version.id}
                              className="flex items-center justify-between text-xs text-muted-foreground"
                            >
                              <span>
                                v{version.version} • {version.state}
                              </span>
                              <span>{formatVersionTimestamp(version)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </Form>
  );
}
