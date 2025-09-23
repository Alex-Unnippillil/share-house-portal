"use client";

import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useNotifications } from "@/hooks/use-notifications";
import { createClient } from "@/utils/supabase-browser";
import { useToast } from "@/components/ui/use-toast";
import { fetchMemberProfile, fetchMembersByUnit } from "@/lib/data/members";
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { OptimisticContext } from "@/lib/optimistic";
import { finalizeOptimisticUpdate, rollbackOptimisticUpdate, startOptimisticUpdate } from "@/lib/optimistic";

void React;

const maintenanceRequestSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  category: z.string().optional(),
  location: z.string().optional(),
});

type MaintenanceRequestFormData = z.infer<typeof maintenanceRequestSchema>;

type MaintenanceRequestCacheItem = {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
};

interface MaintenanceRequestFormProps {
  initialValues?: Partial<MaintenanceRequestFormData>;
}

interface MaintenanceMutationContext {
  optimisticContext: OptimisticContext<MaintenanceRequestCacheItem[]>;
  optimisticRequest: MaintenanceRequestCacheItem;
}

const categories = [
  "Plumbing",
  "Electrical",
  "HVAC",
  "Appliance",
  "Structural",
  "Pest Control",
  "Cleaning",
  "Security",
  "Other"
];

const priorities = [
  { value: "low", label: "Low - Nice to have" },
  { value: "normal", label: "Normal - Standard priority" },
  { value: "high", label: "High - Needs attention soon" },
  { value: "urgent", label: "Urgent - Emergency fix needed" },
];

export function MaintenanceRequestForm({ initialValues }: MaintenanceRequestFormProps = {}) {
  const [optimisticMessage, setOptimisticMessage] = useState<string | null>(null);
  const { notifyMaintenanceRequest } = useNotifications();
  const { toast } = useToast();
  const supabase = createClient();
  const typedSupabase = supabase as unknown as TypedSupabaseClient;
  const queryClient = useQueryClient();

  const defaultValues = useMemo(
    () => ({
      title: initialValues?.title ?? "",
      description: initialValues?.description ?? "",
      priority: initialValues?.priority ?? "normal",
      category: initialValues?.category ?? "",
      location: initialValues?.location ?? "",
    }),
    [initialValues],
  );

  const form = useForm<MaintenanceRequestFormData>({
    resolver: zodResolver(maintenanceRequestSchema),
    defaultValues,
  });

  const maintenanceMutation = useMutation<any, Error, MaintenanceRequestFormData, MaintenanceMutationContext>({
    mutationFn: async (data) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const profile = await fetchMemberProfile(typedSupabase, user.id);
      if (!profile) throw new Error("Profile not found");
      if (!profile.unit_id) {
        throw new Error("User is not assigned to a unit");
      }

      const [propertyManager] = await fetchMembersByUnit(typedSupabase, profile.unit_id, {
        roles: ['property_manager'],
      });

      if (!propertyManager) {
        throw new Error("Property manager not found for this unit");
      }

      const { data: request, error: requestError } = await (supabase as any)
        .from('maintenance_requests')
        .insert({
          title: data.title,
          description: data.description,
          priority: data.priority,
          category: data.category || null,
          location: data.location || null,
          requested_by: user.id,
          unit_id: profile.unit_id,
          status: 'pending',
        })
        .select()
        .single();

      if (requestError) {
        throw new Error(requestError.message ?? 'Failed to submit maintenance request');
      }

      await notifyMaintenanceRequest({
        requesterName: profile.full_name || user.email || 'Unknown',
        title: data.title,
        description: data.description,
        priority: data.priority,
        propertyManager: {
          id: propertyManager.id,
          email: propertyManager.email || '',
          name: propertyManager.full_name || propertyManager.email || 'Unknown',
        },
      });

      return request;
    },
    onMutate: (data) => {
      const optimisticRequest = createOptimisticMaintenanceRequest(data);
      const optimisticContext = startOptimisticUpdate<MaintenanceRequestCacheItem[]>({
        queryClient,
        filters: { queryKey: ['maintenance-requests'] },
        operation: 'create-maintenance-request',
        updateFn: (current = []) => [optimisticRequest, ...current],
      });

      setOptimisticMessage('Maintenance request submitted. Syncing with server...');

      return { optimisticContext, optimisticRequest } satisfies MaintenanceMutationContext;
    },
    onError: (error, _variables, context) => {
      rollbackOptimisticUpdate(queryClient, context?.optimisticContext, error);
      setOptimisticMessage(null);

      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit maintenance request",
        variant: "destructive",
      });
    },
    onSuccess: (request, _variables, context) => {
      const cacheItem = toMaintenanceCacheItem(request);
      finalizeOptimisticUpdate<MaintenanceRequestCacheItem[]>({
        queryClient,
        context: context?.optimisticContext,
        reconcileFn: (current) => {
          if (!current) return current;
          const placeholderId = context?.optimisticRequest.id;
          const hasPlaceholder = current.some(item => item.id === placeholderId);
          const next = current.map(item => item.id === placeholderId ? cacheItem : item);
          return hasPlaceholder ? next : [cacheItem, ...current];
        },
      });

      setOptimisticMessage('Maintenance request synced successfully.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
    },
  });

  const onSubmit = async (data: MaintenanceRequestFormData) => {
    try {
      await maintenanceMutation.mutateAsync(data, {
        onSuccess: () => {
          toast({
            title: "Maintenance request submitted",
            description: "Your maintenance request has been submitted and notifications sent.",
          });
          form.reset(defaultValues);
        },
      });
    } catch (error) {
      console.error('Error submitting maintenance request:', error);
    }
  };

  const isSubmitting = maintenanceMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {optimisticMessage && (
          <div className="rounded-md border border-primary/20 bg-primary/10 p-3 text-sm text-primary">
            {optimisticMessage}
          </div>
        )}

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

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Submitting..." : "Submit Maintenance Request"}
        </Button>
      </form>
    </Form>
  );
}

function createOptimisticMaintenanceRequest(
  data: MaintenanceRequestFormData,
): MaintenanceRequestCacheItem {
  const created_at = new Date().toISOString();
  return {
    id: `temp-maintenance-${created_at}`,
    title: data.title,
    status: 'pending',
    priority: data.priority,
    created_at,
  };
}

function toMaintenanceCacheItem(request: any): MaintenanceRequestCacheItem {
  return {
    id: request.id,
    title: request.title,
    status: request.status ?? 'pending',
    priority: request.priority ?? 'normal',
    created_at: request.created_at ?? new Date().toISOString(),
  };
}
