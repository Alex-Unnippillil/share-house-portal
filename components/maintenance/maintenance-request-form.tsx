"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addHours } from "date-fns";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useNotifications } from "@/hooks/use-notifications";
import { fetchMemberProfile, fetchMembersByUnit } from "@/lib/data/members";
import type { MaintenancePhotoAttachment, MaintenancePriority } from "@/lib/maintenance/types";
import { createClient } from "@/utils/supabase-browser";
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client";

const MAX_FILE_SIZE_MB = 10;
const MAX_PHOTO_COUNT = 5;
const MAINTENANCE_PHOTO_BUCKET = "maintenance-photos";

const maintenanceRequestSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  category: z.string().optional(),
  location: z.string().optional(),
  photos: z
    .array(z.instanceof(File))
    .max(MAX_PHOTO_COUNT, `You can upload up to ${MAX_PHOTO_COUNT} photos`)
    .optional(),
});

type MaintenanceRequestFormData = z.infer<typeof maintenanceRequestSchema>;

type PhotoPreview = {
  name: string;
  url: string;
  size: number;
  type: string;
};

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

const priorities: Array<{ value: MaintenancePriority; label: string }> = [
  { value: "low", label: "Low - Nice to have" },
  { value: "normal", label: "Normal - Standard priority" },
  { value: "high", label: "High - Needs attention soon" },
  { value: "urgent", label: "Urgent - Emergency fix needed" },
];

const SLA_RESPONSE_TARGETS: Record<MaintenancePriority, number> = {
  low: 48,
  normal: 24,
  high: 6,
  urgent: 2,
};

const SLA_RESOLUTION_TARGETS: Record<MaintenancePriority, number> = {
  low: 120,
  normal: 72,
  high: 36,
  urgent: 12,
};

const formatFileSize = (bytes: number) => {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
};

export function MaintenanceRequestForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoPreviews, setPhotoPreviews] = useState<PhotoPreview[]>([]);
  const { notifyMaintenanceRequest } = useNotifications();
  const { toast } = useToast();
  const supabase = createClient();
  const typedSupabase = supabase as unknown as TypedSupabaseClient;

  useEffect(() => {
    return () => {
      photoPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [photoPreviews]);

  const form = useForm<MaintenanceRequestFormData>({
    resolver: zodResolver(maintenanceRequestSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "normal",
      category: "",
      location: "",
      photos: [],
    },
  });

  const resetPhotos = () => {
    setPhotoPreviews((current) => {
      current.forEach((preview) => URL.revokeObjectURL(preview.url));
      return [];
    });
    form.setValue("photos", [], { shouldValidate: true });
  };

  const handlePhotoSelection = (filesList: FileList | null) => {
    if (!filesList) {
      resetPhotos();
      return;
    }

    const acceptedFiles: File[] = [];
    for (const file of Array.from(filesList)) {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the ${MAX_FILE_SIZE_MB} MB limit.`,
          variant: "destructive",
        });
        continue;
      }
      acceptedFiles.push(file);
    }

    if (acceptedFiles.length > MAX_PHOTO_COUNT) {
      toast({
        title: "Photo limit reached",
        description: `Only the first ${MAX_PHOTO_COUNT} photos will be uploaded.`,
      });
    }

    const filesToUse = acceptedFiles.slice(0, MAX_PHOTO_COUNT);

    setPhotoPreviews((current) => {
      current.forEach((preview) => URL.revokeObjectURL(preview.url));
      return filesToUse.map((file) => ({
        name: file.name,
        url: URL.createObjectURL(file),
        size: file.size,
        type: file.type,
      }));
    });

    form.setValue("photos", filesToUse, { shouldValidate: true });
  };

  const uploadPhotos = async (
    files: File[] | undefined,
    unitId: string,
    requestId: string,
  ): Promise<MaintenancePhotoAttachment[]> => {
    if (!files || files.length === 0) {
      return [];
    }

    const attachments: MaintenancePhotoAttachment[] = [];

    for (const [index, file] of files.entries()) {
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-z0-9.\-_]/gi, "-").toLowerCase();
      const storagePath = `${unitId}/${requestId}/reported/${timestamp}-${index}-${sanitizedName}`;

      const { error: uploadError } = await supabase.storage
        .from(MAINTENANCE_PHOTO_BUCKET)
        .upload(storagePath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Unable to upload ${file.name}: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from(MAINTENANCE_PHOTO_BUCKET)
        .getPublicUrl(storagePath);

      attachments.push({
        bucket: MAINTENANCE_PHOTO_BUCKET,
        path: storagePath,
        name: file.name,
        size: file.size,
        mime_type: file.type,
        uploaded_at: new Date().toISOString(),
        public_url: publicUrlData.publicUrl ?? null,
      });
    }

    return attachments;
  };

  const onSubmit = async (data: MaintenanceRequestFormData) => {
    setIsSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const profile = await fetchMemberProfile(typedSupabase, user.id);
      if (!profile) throw new Error("Profile not found");

      if (!profile.unit_id) {
        throw new Error("User is not assigned to a unit");
      }

      const [propertyManager] = await fetchMembersByUnit(typedSupabase, profile.unit_id, {
        roles: ["property_manager"],
      });

      if (!propertyManager) {
        throw new Error("Property manager not found for this unit");
      }

      const requestId = crypto.randomUUID();
      const now = new Date();
      const responseSla = addHours(now, SLA_RESPONSE_TARGETS[data.priority]).toISOString();
      const resolutionSla = addHours(now, SLA_RESOLUTION_TARGETS[data.priority]).toISOString();

      const photoAttachments = await uploadPhotos(data.photos, profile.unit_id, requestId);

      const { error: requestError } = await (supabase as any)
        .from("maintenance_requests")
        .insert({
          id: requestId,
          title: data.title,
          description: data.description,
          priority: data.priority,
          category: data.category || null,
          location: data.location || null,
          requested_by: user.id,
          unit_id: profile.unit_id,
          status: "pending",
          triage_state: "untriaged",
          sla_response_due_at: responseSla,
          sla_resolution_due_at: resolutionSla,
          attachments: [],
          photo_attachments: photoAttachments,
        });

      if (requestError) throw requestError;

      await notifyMaintenanceRequest({
        requesterName: profile.full_name || user.email || "Unknown",
        title: data.title,
        description: data.description,
        priority: data.priority,
        propertyManager: {
          id: propertyManager.id,
          email: propertyManager.email || "",
          name: propertyManager.full_name || propertyManager.email || "Unknown",
        },
      });

      toast({
        title: "Maintenance request submitted",
        description:
          photoAttachments.length > 0
            ? "Your request and photos were submitted. The property team has been notified."
            : "Your maintenance request has been submitted and notifications sent.",
      });

      resetPhotos();
      form.reset({
        title: "",
        description: "",
        priority: "normal",
        category: "",
        location: "",
        photos: [],
      });
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

        <FormField
          control={form.control}
          name="photos"
          render={() => (
            <FormItem>
              <FormLabel>Photos (Optional)</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => {
                    handlePhotoSelection(event.target.files);
                    event.target.value = "";
                  }}
                  disabled={isSubmitting}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                Attach up to {MAX_PHOTO_COUNT} photos. Each file must be smaller than {MAX_FILE_SIZE_MB} MB.
              </p>
              {photoPreviews.length > 0 && (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {photoPreviews.map((preview) => (
                      <div key={preview.url} className="space-y-2">
                        <div className="aspect-square overflow-hidden rounded-md border border-dashed bg-muted/40">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={preview.url}
                            alt={preview.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <p className="truncate text-xs font-medium">{preview.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatFileSize(preview.size)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetPhotos}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto"
                  >
                    Clear selected photos
                  </Button>
                </div>
              )}
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

export function MaintenanceRequestFormCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Maintenance Request</CardTitle>
        <CardDescription>
          Describe the issue, set priority, and optionally add photos. Property managers will be notified automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <MaintenanceRequestForm />
      </CardContent>
    </Card>
  );
}
