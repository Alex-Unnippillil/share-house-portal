"use client";

import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, formatDistanceToNow } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/use-notifications";
import { useAutosaveDraft } from "@/hooks/use-autosave-draft";
import { createClient } from "@/utils/supabase-browser";
import { useToast } from "@/components/ui/use-toast";

const visitorBookingSchema = z.object({
  guestName: z.string().min(2, "Guest name must be at least 2 characters"),
  guestEmail: z.string().email("Please enter a valid email address"),
  guestPhone: z.string().optional(),
  checkInDate: z.date({
    required_error: "Check-in date is required",
  }),
  checkOutDate: z.date({
    required_error: "Check-out date is required",
  }),
  purpose: z.string().min(10, "Please provide more details about the visit"),
  emergencyContact: z.string().optional(),
  specialNotes: z.string().optional(),
});

type VisitorBookingFormData = z.infer<typeof visitorBookingSchema>;

type VisitorBookingDraftPayload = Omit<VisitorBookingFormData, "checkInDate" | "checkOutDate"> & {
  checkInDate?: string | null;
  checkOutDate?: string | null;
};

export function VisitorBookingForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { notifyVisitorBooking } = useNotifications();
  const { toast } = useToast();
  const supabase = createClient();

  const form = useForm<VisitorBookingFormData>({
    resolver: zodResolver(visitorBookingSchema),
    defaultValues: {
      guestName: "",
      guestEmail: "",
      guestPhone: "",
      purpose: "",
      emergencyContact: "",
      specialNotes: "",
    },
  });

  const watchedValues = form.watch();

  const serializeDraft = useCallback(
    (values: VisitorBookingFormData): VisitorBookingDraftPayload => ({
      guestName: values.guestName,
      guestEmail: values.guestEmail,
      guestPhone: values.guestPhone,
      purpose: values.purpose,
      emergencyContact: values.emergencyContact,
      specialNotes: values.specialNotes,
      checkInDate: values.checkInDate ? values.checkInDate.toISOString() : null,
      checkOutDate: values.checkOutDate ? values.checkOutDate.toISOString() : null,
    }),
    [],
  );

  const deserializeDraft = useCallback(
    (payload: VisitorBookingDraftPayload): Partial<VisitorBookingFormData> => {
      const { checkInDate, checkOutDate, ...rest } = payload;

      return {
        ...rest,
        checkInDate: checkInDate ? new Date(checkInDate) : undefined,
        checkOutDate: checkOutDate ? new Date(checkOutDate) : undefined,
      };
    },
    [],
  );

  const {
    status: autosaveStatus,
    lastSavedAt,
    lastError,
    hasDraft,
    isLoadingDraft,
    resolvedStorage,
    clearDraft,
    resumeDraft,
  } = useAutosaveDraft<VisitorBookingFormData, VisitorBookingDraftPayload>(
    "visitor-booking",
    watchedValues,
    {
      storage: "supabase",
      throttleMs: 2000,
      isDirty: form.formState.isDirty,
      serialize: serializeDraft,
      deserialize: deserializeDraft,
    },
  );

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
      description: "Your visitor booking draft has been loaded.",
    });
  }, [form, resumeDraft, toast]);

  const handleDiscardDraft = useCallback(async () => {
    await clearDraft();
    toast({
      title: "Draft discarded",
      description: "Autosaved progress has been cleared.",
    });
  }, [clearDraft, toast]);

  const onSubmit = async (data: VisitorBookingFormData) => {
    setIsSubmitting(true);

    try {
      // Get current user info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, unit_id')
        .eq('id', user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      // Get roommates and property manager
      // This assumes there's a units table with tenant relationships
      const { data: unitData } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('unit_id', profile.unit_id!)
        .neq('id', user.id);

      const roommates = unitData?.filter(p => p.role === 'tenant' || p.role === 'roommate') || [];
      const propertyManager = unitData?.find(p => p.role === 'property_manager');

      if (!propertyManager) {
        throw new Error("Property manager not found for this unit");
      }

      // Create visitor booking record
      const { data: booking, error: bookingError } = await (supabase as any)
        .from('visitor_logs')
        .insert({
          guest_name: data.guestName,
          guest_email: data.guestEmail,
          guest_phone: data.guestPhone,
          host_id: user.id,
          check_in_date: data.checkInDate.toISOString(),
          check_out_date: data.checkOutDate.toISOString(),
          purpose: data.purpose,
          emergency_contact: data.emergencyContact,
          special_notes: data.specialNotes,
          status: 'pending',
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Send notifications
      await notifyVisitorBooking({
        guestName: data.guestName,
        hostName: profile.full_name || user.email || 'Unknown',
        checkInDate: format(data.checkInDate, 'MMM dd, yyyy'),
        checkOutDate: format(data.checkOutDate, 'MMM dd, yyyy'),
        purpose: data.purpose,
        roommates: roommates.map(r => ({
          id: r.id,
          email: r.email || '',
          name: r.full_name || r.email || 'Unknown',
        })),
        propertyManager: {
          id: propertyManager.id,
          email: propertyManager.email || '',
          name: propertyManager.full_name || propertyManager.email || 'Unknown',
        },
      });

      toast({
        title: "Visitor booking submitted",
        description: "Your visitor booking has been submitted and notifications sent.",
      });

      form.reset();
      await clearDraft().catch(() => undefined);
    } catch (error) {
      console.error('Error submitting visitor booking:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit visitor booking",
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
                    : "Resume your in-progress booking."}{" "}
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

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="guestName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Guest Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter guest's full name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="guestEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Guest Email *</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="guest@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="guestPhone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Guest Phone (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="+1 (555) 123-4567" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="checkInDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Check-in Date *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto size-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="checkOutDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Check-out Date *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto size-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="purpose"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Purpose of Visit *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Please describe the purpose of the visit and any special requirements..."
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="emergencyContact"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Emergency Contact (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Name and phone number of emergency contact" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="specialNotes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Special Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any additional notes or requirements..."
                  className="min-h-[60px]"
                  {...field}
                />
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
          {isSubmitting ? "Submitting..." : "Submit Visitor Booking"}
        </Button>
      </form>
    </Form>
  );
}
