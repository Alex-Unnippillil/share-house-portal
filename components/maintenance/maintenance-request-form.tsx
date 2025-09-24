"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useNotifications } from "@/hooks/use-notifications";
import { createClient } from "@/utils/supabase-browser";
import { useToast } from "@/components/ui/use-toast";
import { fetchMemberProfile, fetchMembersByUnit } from "@/lib/data/members";
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client";
import { UploadCloud, X } from "lucide-react";

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_SIZE_MB = 5;

const attachmentSchema = z
  .instanceof(File)
  .refine(
    (file) => file.size <= MAX_ATTACHMENT_SIZE_MB * 1024 * 1024,
    `Each photo must be ${MAX_ATTACHMENT_SIZE_MB}MB or smaller`
  )
  .refine((file) => file.type.startsWith("image/"), "Only image files are supported");

const maintenanceRequestSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  category: z.string().optional(),
  location: z.string().optional(),
  attachments: z
    .array(attachmentSchema)
    .max(MAX_ATTACHMENTS, `You can upload up to ${MAX_ATTACHMENTS} photos`)
    .optional(),
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
  const typedSupabase = supabase as unknown as TypedSupabaseClient;

  const form = useForm<MaintenanceRequestFormData>({
    resolver: zodResolver(maintenanceRequestSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "normal",
      category: "",
      location: "",
      attachments: [],
    },
  });

  const attachments = form.watch("attachments");
  const attachmentPreviews = useMemo(
    () =>
      (attachments ?? []).map((file) => ({
        url: URL.createObjectURL(file),
        name: file.name,
      })),
    [attachments]
  );

  useEffect(() => {
    return () => {
      attachmentPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [attachmentPreviews]);

  const onSubmit = async (data: MaintenanceRequestFormData) => {
    setIsSubmitting(true);

    try {
      // Get current user info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get user profile
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

      const attachmentFiles = data.attachments ?? [];
      const uploadedPaths: string[] = [];
      const uploadedAttachments: Array<{
        name: string;
        url: string;
        path: string;
        type: string;
        size: number;
      }> = [];

      if (attachmentFiles.length > 0) {
        for (const file of attachmentFiles) {
          const fileExt = file.name.split(".").pop()?.toLowerCase();
          const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
          const safeExt = fileExt ? `.${fileExt}` : "";
          const filePath = `maintenance/${user.id}/${uniqueSuffix}${safeExt}`;

          const { error: uploadError } = await supabase.storage
            .from("maintenance-attachments")
            .upload(filePath, file, {
              contentType: file.type,
            });

          if (uploadError) {
            if (uploadedPaths.length > 0) {
              await supabase.storage.from("maintenance-attachments").remove(uploadedPaths);
            }
            throw new Error(
              `Failed to upload ${file.name}: ${uploadError.message ?? "Unknown error"}`
            );
          }

          uploadedPaths.push(filePath);

          const {
            data: { publicUrl },
          } = supabase.storage.from("maintenance-attachments").getPublicUrl(filePath);

          uploadedAttachments.push({
            name: file.name,
            url: publicUrl,
            path: filePath,
            type: file.type,
            size: file.size,
          });
        }
      }

      // Create maintenance request record
      const { error: requestError } = await (supabase as any)
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
          attachments: uploadedAttachments,
        })
        .select()
        .single();

      if (requestError) {
        if (uploadedPaths.length > 0) {
          await supabase.storage.from("maintenance-attachments").remove(uploadedPaths);
        }
        throw requestError;
      }

      // Send notifications
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
        attachments: uploadedAttachments.map((attachment) => ({
          name: attachment.name,
          url: attachment.url,
        })),
      });

      toast({
        title: "Maintenance request submitted",
        description: "Your maintenance request has been submitted and notifications sent.",
      });

      form.reset();
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
          name="attachments"
          render={({ field }) => {
            const selectedFiles = field.value ?? [];

            const handleAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
              const files = Array.from(event.target.files ?? []);

              if (files.length === 0) {
                return;
              }

              const remainingSlots = MAX_ATTACHMENTS - selectedFiles.length;
              if (remainingSlots <= 0) {
                toast({
                  title: "Attachment limit reached",
                  description: `You can upload up to ${MAX_ATTACHMENTS} photos per request.`,
                  variant: "destructive",
                });
                event.target.value = "";
                return;
              }

              const filesToAdd = files.slice(0, remainingSlots);

              if (filesToAdd.length < files.length) {
                toast({
                  title: "Attachment limit reached",
                  description: `Only ${remainingSlots} more photo${
                    remainingSlots === 1 ? "" : "s"
                  } can be uploaded.`,
                  variant: "destructive",
                });
              }

              field.onChange([...selectedFiles, ...filesToAdd]);
              field.onBlur();
              event.target.value = "";
            };

            const handleRemoveAttachment = (index: number) => {
              const updated = selectedFiles.filter((_, fileIndex) => fileIndex !== index);
              field.onChange(updated);
            };

            return (
              <FormItem>
                <FormLabel>Upload Photos (Optional)</FormLabel>
                <FormControl>
                  <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 p-6 text-center">
                    <input
                      id="maintenance-attachments"
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleAttachmentChange}
                      ref={field.ref}
                      className="hidden"
                    />
                    <label
                      htmlFor="maintenance-attachments"
                      className="flex cursor-pointer flex-col items-center gap-3 text-sm"
                    >
                      <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <UploadCloud className="size-6" />
                      </span>
                      <span className="font-medium text-foreground">Click to upload or drag and drop</span>
                      <span className="text-xs text-muted-foreground">
                        {`Up to ${MAX_ATTACHMENTS} photos (JPEG, PNG, or HEIC) — ${MAX_ATTACHMENT_SIZE_MB}MB each`}
                      </span>
                    </label>
                  </div>
                </FormControl>
                <FormDescription>
                  Adding photos helps property managers resolve issues faster and keeps everything documented.
                </FormDescription>
                {attachmentPreviews.length > 0 && (
                  <div className="grid gap-3 pt-3 sm:grid-cols-2">
                    {attachmentPreviews.map((preview, index) => (
                      <div
                        key={preview.url}
                        className="relative overflow-hidden rounded-md border bg-background"
                      >
                        <Image
                          src={preview.url}
                          alt={`Uploaded photo ${index + 1}`}
                          width={320}
                          height={128}
                          className="h-32 w-full object-cover"
                          unoptimized
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(index)}
                          className="absolute right-2 top-2 inline-flex items-center justify-center rounded-full bg-black/60 p-1 text-white transition hover:bg-black/80"
                          aria-label={`Remove ${preview.name}`}
                        >
                          <X className="size-4" />
                        </button>
                        <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 text-xs text-white">
                          <span className="block truncate" title={preview.name}>
                            {preview.name}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Submitting..." : "Submit Maintenance Request"}
        </Button>
      </form>
    </Form>
  );
}
