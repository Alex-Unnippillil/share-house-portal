"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useNotifications } from "@/hooks/use-notifications";
import { createClient } from "@/utils/supabase-browser";
import { useToast } from "@/components/ui/use-toast";
import { fetchMemberProfile, fetchMembersByUnit } from "@/lib/data/members";
import type { Database } from "@/lib/supabase";
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client";

const maintenanceRequestSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  category: z.string().optional(),
  location: z.string().optional(),
});

type MaintenanceRequestFormData = z.infer<typeof maintenanceRequestSchema>;

type MaintenanceRequestRow =
  Database["public"]["Tables"]["maintenance_requests"]["Row"];

const FALLBACK_PROFILE = {
  id: "demo-tenant-3b",
  full_name: "Jordan Blake",
  email: "jordan.blake@example.com",
  unit_id: "unit-3b-demo",
};

const FALLBACK_PROPERTY_MANAGER = {
  id: "demo-property-manager",
  full_name: "Morgan Ellis",
  email: "morgan.ellis@sharehouse.example",
};

const FALLBACK_UNIT_LABEL = "Unit 3B";

const DEMO_STORAGE_KEY = "demo-maintenance-requests";

type DemoMaintenanceRequest = Pick<
  MaintenanceRequestRow,
  | "id"
  | "title"
  | "description"
  | "priority"
  | "category"
  | "location"
  | "status"
  | "requested_by"
  | "unit_id"
  | "assigned_to"
  | "created_at"
  | "metadata"
>;

function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return Boolean(url && url.trim() !== "" && anonKey && anonKey.trim() !== "");
}

function normalizeOptionalField(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function shouldFallbackToDemo(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  const indicators = [
    "not authenticated",
    "failed to load member profile",
    "failed to load members for unit",
    "failed to load session",
    "profile not found",
    "user is not assigned to a unit",
    "property manager not found",
    "could not find the table 'public.profiles'",
    "failed to create maintenance request",
    "maintenance_requests",
    "failed to fetch",
  ];

  return indicators.some((indicator) => message.includes(indicator));
}

function createDemoMaintenanceRequest(
  formData: MaintenanceRequestFormData,
  submittedAt: string,
): DemoMaintenanceRequest {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `demo-${Date.now()}`;

  const category = normalizeOptionalField(formData.category);
  const location = normalizeOptionalField(formData.location);

  return {
    id,
    title: formData.title,
    description: formData.description,
    priority: formData.priority,
    category,
    location,
    status: "pending",
    requested_by: FALLBACK_PROFILE.id,
    unit_id: FALLBACK_PROFILE.unit_id,
    assigned_to: FALLBACK_PROPERTY_MANAGER.id,
    created_at: submittedAt,
    metadata: {
      submitted_from: "demo",
      submitted_at: submittedAt,
      category,
      location,
      priority: formData.priority,
    },
  };
}

function persistDemoMaintenanceRequest(request: DemoMaintenanceRequest) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const existingRaw = window.localStorage.getItem(DEMO_STORAGE_KEY);
    const existing = existingRaw
      ? ((JSON.parse(existingRaw) as DemoMaintenanceRequest[]) ?? [])
      : [];
    const updated = [request, ...existing].slice(0, 20);
    window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(updated));
  } catch (storageError) {
    console.warn("Failed to persist demo maintenance request", storageError);
  }
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

export function MaintenanceRequestForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { notifyMaintenanceRequest } = useNotifications();
  const { toast } = useToast();
  const supabase = createClient();
  const typedSupabase = supabase as unknown as TypedSupabaseClient;

  const form = useForm<MaintenanceRequestFormData>({
    resolver: zodResolver(maintenanceRequestSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "normal",
      category: "",
      location: "",
    },
  });

  const onSubmit = async (formData: MaintenanceRequestFormData) => {
    setIsSubmitting(true);

    const supabaseConfigured = isSupabaseConfigured();
    const fallbackSubmission = async (reason?: string) => {
      const submittedAt = new Date().toISOString();
      const demoRequest = createDemoMaintenanceRequest(formData, submittedAt);
      persistDemoMaintenanceRequest(demoRequest);

      console.info("Using demo maintenance submission flow", { reason });

      await notifyMaintenanceRequest({
        requesterName:
          FALLBACK_PROFILE.full_name || FALLBACK_PROFILE.email || "Demo tenant",
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        category: demoRequest.category ?? undefined,
        location: demoRequest.location ?? undefined,
        unitLabel: FALLBACK_UNIT_LABEL,
        submittedAt,
        requestId: demoRequest.id,
        propertyManager: {
          id: FALLBACK_PROPERTY_MANAGER.id,
          email: FALLBACK_PROPERTY_MANAGER.email,
          name:
            FALLBACK_PROPERTY_MANAGER.full_name ||
            FALLBACK_PROPERTY_MANAGER.email ||
            "Demo property manager",
        },
      });

      toast({
        title: "Maintenance request submitted",
        description:
          reason && supabaseConfigured
            ? "We saved this request using demo data because live services were unavailable."
            : "We're running in demo mode, so the request was stored locally and the demo property manager has been notified.",
      });

      form.reset();
    };

    try {
      if (!supabaseConfigured) {
        await fallbackSubmission("supabase-not-configured");
        return;
      }

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw new Error(`Failed to load session: ${authError.message}`);
        }

        if (!user) {
          throw new Error("Not authenticated");
        }

        const profile = await fetchMemberProfile(typedSupabase, user.id);

        if (!profile) {
          throw new Error("Profile not found");
        }

        if (!profile.unit_id) {
          throw new Error("User is not assigned to a unit");
        }

        const [propertyManager] = await fetchMembersByUnit(
          typedSupabase,
          profile.unit_id,
          {
            roles: ["property_manager"],
          },
        );

        if (!propertyManager) {
          throw new Error("Property manager not found for this unit");
        }

        const normalizedCategory = normalizeOptionalField(formData.category);
        const normalizedLocation = normalizeOptionalField(formData.location);
        const submittedAt = new Date().toISOString();

        const { data: request, error: requestError } = await typedSupabase
          .from("maintenance_requests")
          .insert({
            title: formData.title,
            description: formData.description,
            priority: formData.priority,
            category: normalizedCategory,
            location: normalizedLocation,
            requested_by: user.id,
            unit_id: profile.unit_id,
            status: "pending",
            assigned_to: propertyManager.id,
            metadata: {
              submitted_from: "tenant_portal",
              submitted_at: submittedAt,
              category: normalizedCategory,
              location: normalizedLocation,
              priority: formData.priority,
            },
          })
          .select()
          .single();

        if (requestError) {
          throw new Error(
            `Failed to create maintenance request: ${requestError.message}`,
          );
        }

        const createdRequest = (request as MaintenanceRequestRow | null) ?? null;

        await notifyMaintenanceRequest({
          requesterName: profile.full_name || user.email || "Unknown",
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          category: normalizedCategory ?? undefined,
          location: normalizedLocation ?? undefined,
          unitLabel: profile.unit_id ?? undefined,
          submittedAt: createdRequest?.created_at ?? submittedAt,
          requestId: createdRequest?.id,
          propertyManager: {
            id: propertyManager.id,
            email: propertyManager.email || undefined,
            name:
              propertyManager.full_name ||
              propertyManager.email ||
              "Unknown",
          },
        });

        toast({
          title: "Maintenance request submitted",
          description:
            "Your maintenance request has been submitted and notifications sent.",
        });

        form.reset();
      } catch (supabaseError) {
        console.warn(
          "Maintenance request submission failed, attempting demo fallback",
          supabaseError,
        );

        if (shouldFallbackToDemo(supabaseError)) {
          await fallbackSubmission(
            supabaseError instanceof Error ? supabaseError.message : undefined,
          );
          return;
        }

        throw supabaseError;
      }
    } catch (error) {
      console.error("Error submitting maintenance request:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to submit maintenance request",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
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

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Submitting..." : "Submit Maintenance Request"}
        </Button>
      </form>
    </Form>
  );
}
