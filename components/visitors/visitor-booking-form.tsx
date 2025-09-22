"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/use-notifications";
import { createClient } from "@/utils/supabase-browser";
import { useToast } from "@/components/ui/use-toast";
import { recordSupportFeedback } from "@/utils/support-feedback";

const ESTIMATED_SUBMISSION_SECONDS = 8;

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

export function VisitorBookingForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { notifyVisitorBooking } = useNotifications();
  const { toast } = useToast();
  const supabase = createClient();

  const trackSupportFeedback = (
    action: string,
    status: "pending" | "resolved" | "escalated",
    description?: string,
    metadata?: Record<string, unknown>
  ) => {
    void recordSupportFeedback({
      source: "visitor_booking",
      action,
      status,
      description,
      metadata,
    });
  };

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

  const onSubmit = async (data: VisitorBookingFormData) => {
    setIsSubmitting(true);

    toast({
      title: "Submitting overnight visitor request",
      description: `We’re saving your visitor details and queuing notifications now. This usually takes about ${ESTIMATED_SUBMISSION_SECONDS} seconds. Feel free to keep browsing while we finish.`,
      duration: 6000,
    });

    trackSupportFeedback("submission_started", "pending", undefined, {
      estimatedSeconds: ESTIMATED_SUBMISSION_SECONDS,
      guestName: data.guestName,
      checkInDate: data.checkInDate.toISOString(),
      checkOutDate: data.checkOutDate.toISOString(),
    });

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
        throw new Error("We couldn’t locate a property manager for your unit. Please contact support before logging overnight guests.");
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
        title: "Visitor request submitted",
        description: "We saved the visit details and pinged your roommates and property manager. They'll review it in the visitor log.",
      });

      trackSupportFeedback("submission_completed", "resolved", undefined, {
        bookingId: booking?.id ?? null,
        guestName: data.guestName,
        roommateCount: roommates.length,
      });

      form.reset();
    } catch (error) {
      console.error('Error submitting visitor booking:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "We couldn’t submit your visitor request. Please try again or contact your property manager.";
      toast({
        title: "Visitor request not sent",
        description: `${errorMessage} If this keeps happening, let your property manager know so we can help.`,
        variant: "destructive",
      });
      trackSupportFeedback("submission_failed", "escalated", errorMessage, {
        guestName: data.guestName,
        error: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="guestName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Guest full name *</FormLabel>
                <FormControl>
                  <Input placeholder="As shown on their government ID" {...field} />
                </FormControl>
                <FormDescription>
                  Use the exact name from your guest’s identification so building security can confirm their arrival without
                  delays.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="guestEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Guest email for updates *</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="guest@example.com" {...field} />
                </FormControl>
                <FormDescription>
                  We’ll send arrival reminders and policy notes to this address so everyone knows what to expect.
                </FormDescription>
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
              <FormLabel>Guest phone (optional)</FormLabel>
              <FormControl>
                <Input placeholder="Include country code if outside the US" {...field} />
              </FormControl>
              <FormDescription>
                We’ll only call this number if there’s a check-in issue or an emergency during the stay.
              </FormDescription>
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
                          <span>Select arrival date</span>
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
                <FormDescription>
                  Choose the arrival day your guest will check in. Same-day visits are allowed until quiet hours begin.
                </FormDescription>
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
                          <span>Select departure date</span>
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
                <FormDescription>
                  Set the day your guest will leave so we can keep overnight limits accurate.
                </FormDescription>
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
                  placeholder="Explain why your guest is staying and any plans roommates should know about"
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Share context—celebration, family visit, or support—so roommates understand the reason for the stay.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="emergencyContact"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Emergency contact (optional)</FormLabel>
              <FormControl>
                <Input placeholder="Name and phone number to reach if we can’t contact the guest" {...field} />
              </FormControl>
              <FormDescription>
                Add a backup contact we can reach if there’s a safety concern while your guest is on-site.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="specialNotes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Special notes (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Parking needs, accessibility notes, or quiet hours reminders"
                  className="min-h-[60px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Mention anything that helps your roommates prepare—vehicle details, sleeping arrangements, or building access.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting
              ? `Submitting request (≈${ESTIMATED_SUBMISSION_SECONDS}s)`
              : "Submit overnight visitor request"}
          </Button>
          {isSubmitting ? (
            <p
              className="text-center text-sm text-muted-foreground"
              aria-live="polite"
              role="status"
            >
              {`We’re saving your visitor booking and notifying everyone now. This usually wraps up in about ${ESTIMATED_SUBMISSION_SECONDS} seconds.`}
            </p>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              We’ll alert your roommates and property manager as soon as you send this request.
            </p>
          )}
        </div>
      </form>
    </Form>
  );
}
