"use client";

import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useNotifications } from "@/hooks/use-notifications";
import { useAutosaveDraft } from "@/hooks/use-autosave-draft";
import { createClient } from "@/utils/supabase-browser";
import { useToast } from "@/components/ui/use-toast";

const maintenanceRequestSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  category: z.string().optional(),
  location: z.string().optional(),
});

type MaintenanceRequestFormData = z.infer<typeof maintenanceRequestSchema>;

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

  const watchedValues = form.watch();

  const {
    status: autosaveStatus,
    lastSavedAt,
    lastError,
    hasDraft,
    isLoadingDraft,
    resolvedStorage,
    clearDraft,
    resumeDraft,
  } = useAutosaveDraft<MaintenanceRequestFormData>("maintenance-request", watchedValues, {
    storage: "supabase",
    throttleMs: 2000,
    isDirty: form.formState.isDirty,
  });

  const autosaveMessage = useMemo(() => {
    if (autosaveStatus === "saving") {
      return "Saving draft...";
    }

    if (autosaveStatus === "saved" && lastSavedAt) {
      return `Draft saved ${formatDistanceToNow(lastSavedAt, { addSuffix: true })}`;
    }

    if (autosaveStatus === "error") {
      return lastError ? `Autosave failed: ${lastError}` : "Autosave failed";
    }

    if (!form.formState.isDirty) {
      return "Autosave ready. Start typing to save your draft.";
    }

    return "Autosave idle";
  }, [autosaveStatus, lastError, lastSavedAt, form.formState.isDirty]);

  const storageMessage = resolvedStorage === "supabase" ? "Synced to Supabase" : "Stored on this device";

  const handleResumeDraft = useCallback(async () => {
    const draft = await resumeDraft();

    if (!draft) {
      toast({
        title: "No draft found",
        description: "There is no saved draft to restore.",
      });
      return;
    }

    form.reset({
      ...form.getValues(),
      ...draft,
    });

    toast({
      title: "Draft restored",
      description: "Your in-progress maintenance request has been loaded.",
    });
  }, [form, resumeDraft, toast]);

  const handleDiscardDraft = useCallback(async () => {
    await clearDraft();
    toast({
      title: "Draft discarded",
      description: "Autosaved progress has been cleared.",
    });
  }, [clearDraft, toast]);

  const onSubmit = async (data: MaintenanceRequestFormData) => {
    setIsSubmitting(true);

    try {
      // Get current user info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, unit_id')
        .eq('id', user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      if (!profile.unit_id) {
        throw new Error("User is not assigned to a unit");
      }

      // Get property manager for this unit
      const { data: propertyManager } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('unit_id', profile.unit_id!)
        .eq('role', 'property_manager')
        .single();

      if (!propertyManager) {
        throw new Error("Property manager not found for this unit");
      }

      // Create maintenance request record
      const { data: request, error: requestError } = await (supabase as any)
        .from('maintenance_requests')
        .insert({
          title: data.title,
          description: data.description,
          priority: data.priority,
          category: data.category || null,
          location: data.location || null,
          requested_by: user.id,
          unit_id: (profile as any).unit_id,
          status: 'pending',
        })
        .select()
        .single();

      if (requestError) throw requestError;

      // Send notifications
      await notifyMaintenanceRequest({
        requesterName: (profile as any).full_name || user.email || 'Unknown',
        title: data.title,
        description: data.description,
        priority: data.priority,
        propertyManager: {
          id: propertyManager.id,
          email: propertyManager.email || '',
          name: propertyManager.full_name || propertyManager.email || 'Unknown',
        },
      });

      toast({
        title: "Maintenance request submitted",
        description: "Your maintenance request has been submitted and notifications sent.",
      });

      form.reset();
      await clearDraft().catch(() => undefined);
    } catch (error) {
      console.error('Error submitting maintenance request:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit maintenance request",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {!isLoadingDraft && hasDraft && (
          <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-4">
            <div className="flex flex-col gap-2 text-sm">
              <div>
                <p className="font-medium text-primary">Saved draft available</p>
                <p className="text-muted-foreground">
                  {lastSavedAt
                    ? `Last saved ${formatDistanceToNow(lastSavedAt, { addSuffix: true })}.`
                    : "Resume your in-progress request."}{" "}
                  {storageMessage}.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" size="sm" onClick={handleResumeDraft}>
                  Resume draft
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={handleDiscardDraft}>
                  Discard draft
                </Button>
              </div>
            </div>
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

        <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={autosaveStatus === "error" ? "text-destructive" : "text-muted-foreground"}>
              {autosaveMessage}
            </span>
            <span className="font-medium text-muted-foreground">{storageMessage}</span>
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Submitting..." : "Submit Maintenance Request"}
        </Button>
      </form>
    </Form>
  );
}
