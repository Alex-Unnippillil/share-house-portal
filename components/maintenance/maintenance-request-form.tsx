"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { fetchMemberProfile, fetchMembersByUnit } from "@/lib/data/members";
import { createClient } from "@/utils/supabase-browser";
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client";

const maintenanceRequestSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  category: z.string().min(1, "Category is required"),
  severity: z.enum(["low", "medium", "high", "critical"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  preferredAccessTimes: z.string().min(5, "Please describe preferred access windows"),
  location: z.string().optional(),
  propertyLabel: z.string().optional(),
  unitLabel: z.string().optional(),
});

type MaintenanceRequestFormData = z.infer<typeof maintenanceRequestSchema>;

interface MaintenanceRequestFormProps {
  onSubmitted?: () => Promise<void> | void;
}

const categories = ["Plumbing", "Electrical", "HVAC", "Appliance", "Structural", "Pest Control", "Cleaning", "Security", "Other"];

const severities: Array<{ value: MaintenanceRequestFormData["severity"]; label: string; slaHours: number }> = [
  { value: "low", label: "Low", slaHours: 120 },
  { value: "medium", label: "Medium", slaHours: 72 },
  { value: "high", label: "High", slaHours: 24 },
  { value: "critical", label: "Critical", slaHours: 8 },
];

const priorities = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
] as const;

export function MaintenanceRequestForm({ onSubmitted }: MaintenanceRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const { toast } = useToast();
  const supabase = createClient();
  const typedSupabase = supabase as unknown as TypedSupabaseClient;

  const form = useForm<MaintenanceRequestFormData>({
    resolver: zodResolver(maintenanceRequestSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "normal",
      severity: "medium",
      category: "",
      location: "",
      preferredAccessTimes: "Weekdays 9:00 AM - 1:00 PM",
      propertyLabel: "",
      unitLabel: "",
    },
  });

  const selectedSeverity = form.watch("severity");

  const selectedSlaHours = useMemo(
    () => severities.find((entry) => entry.value === selectedSeverity)?.slaHours ?? 72,
    [selectedSeverity]
  );

  const uploadAttachments = async (requestId: string) => {
    if (!attachmentFiles.length) return [];

    const uploads = await Promise.all(
      attachmentFiles.map(async (file) => {
        const path = `${requestId}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from("maintenance-attachments").upload(path, file, {
          upsert: false,
          contentType: file.type,
        });
        if (error) throw error;

        const {
          data: { publicUrl },
        } = supabase.storage.from("maintenance-attachments").getPublicUrl(path);

        return {
          name: file.name,
          size: file.size,
          type: file.type,
          path,
          url: publicUrl,
        };
      })
    );

    return uploads;
  };

  const onSubmit = async (data: MaintenanceRequestFormData) => {
    setIsSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const profile = await fetchMemberProfile(typedSupabase, user.id);
      if (!profile?.unit_id) throw new Error("You must be assigned to a unit before submitting a request.");

      const [propertyManager] = await fetchMembersByUnit(typedSupabase, profile.unit_id, { roles: ["property_manager", "admin"] });

      const { data: request, error: requestError } = await (supabase as any)
        .from("maintenance_requests")
        .insert({
          title: data.title,
          description: data.description,
          priority: data.priority,
          severity: data.severity,
          category: data.category,
          location: data.location || null,
          requested_by: user.id,
          unit_id: profile.unit_id,
          property_label: data.propertyLabel || null,
          unit_label: data.unitLabel || null,
          preferred_access_times: [data.preferredAccessTimes],
          status: "pending",
          sla_due_at: new Date(Date.now() + selectedSlaHours * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (requestError) throw requestError;

      const attachments = await uploadAttachments(request.id);
      if (attachments.length) {
        const { error: attachmentError } = await (supabase as any)
          .from("maintenance_requests")
          .update({ attachments })
          .eq("id", request.id);

        if (attachmentError) throw attachmentError;
      }

      await (supabase as any).from("maintenance_request_updates").insert({
        request_id: request.id,
        event_type: "submitted",
        actor_id: user.id,
        message: `Request submitted with ${data.severity} severity and ${data.priority} priority.`,
        metadata: {
          preferredAccessTimes: data.preferredAccessTimes,
          attachmentCount: attachmentFiles.length,
        },
      });

      if (propertyManager?.id) {
        await (supabase as any).from("notifications").insert({
          user_id: propertyManager.id,
          title: "New maintenance request submitted",
          message: `${profile.full_name || user.email || "A tenant"} submitted ${data.title}.`,
          type: "warning",
          metadata: { requestId: request.id, severity: data.severity },
        });
      }

      toast({
        title: "Maintenance request submitted",
        description: "Your request has been logged with timeline tracking and SLA targets.",
      });

      form.reset();
      setAttachmentFiles([]);
      await onSubmitted?.();
    } catch (error) {
      console.error("Error submitting maintenance request:", error);
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
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Issue title *</FormLabel>
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
              <FormLabel>Description *</FormLabel>
              <FormControl>
                <Textarea className="min-h-[110px]" placeholder="Describe symptoms, impact, and when this started. Include any safety risks for roommates or visitors." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
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

          <FormField
            control={form.control}
            name="severity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Severity *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {severities.map((severity) => (
                      <SelectItem key={severity.value} value={severity.value}>
                        {severity.label}
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
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Priority" />
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
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="propertyLabel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Property (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Lakeside Residences" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="unitLabel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Unit B-204" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="preferredAccessTimes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preferred access times *</FormLabel>
              <p className="text-xs text-muted-foreground">Provide windows when maintenance can enter the unit and note if a roommate must be present.</p>
              <FormControl>
                <Textarea placeholder="Weekdays after 6pm, Saturdays 9am-1pm, call before arrival." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location (optional)</FormLabel>
              <FormControl>
                <Input placeholder="Kitchen sink, Bedroom 2, hallway AC vent" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <FormLabel>Media attachments</FormLabel>
          <Input
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={(event) => setAttachmentFiles(Array.from(event.target.files ?? []))}
          />
          <p className="text-xs text-muted-foreground">{attachmentFiles.length} file(s) selected</p>
        </div>

        <p className="text-xs text-muted-foreground">Current SLA target: first manager response within {selectedSlaHours} hours.</p>

        <p className="text-xs text-muted-foreground">Maintenance requests are for repairs and safety issues only. Use visitor booking for guest stays and document upload for lease/compliance files.</p>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Submitting…" : "Submit maintenance request"}
        </Button>
      </form>
    </Form>
  );
}
