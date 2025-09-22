"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/use-notifications";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
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

type AvailabilityState = "idle" | "checking" | "conflict" | "available";

export function VisitorBookingForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availabilityState, setAvailabilityState] = useState<AvailabilityState>("idle");
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const { notifyVisitorBooking } = useNotifications();
  const { toast } = useToast();
  const supabase = createClient();
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

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

  const guestEmail = useWatch({ control: form.control, name: "guestEmail" });
  const checkInDate = useWatch({ control: form.control, name: "checkInDate" });
  const checkOutDate = useWatch({ control: form.control, name: "checkOutDate" });

  const debouncedCheckAvailability = useDebouncedCallback(
    async (email: string, start: Date, end: Date) => {
      try {
        const { data, error } = await (supabase as any)
          .from('visitor_logs')
          .select('id, check_in_date, check_out_date, status')
          .ilike('guest_email', email)
          .neq('status', 'cancelled')
          .order('check_in_date', { ascending: false })
          .limit(10);

        if (error) {
          throw error;
        }

        if (!isMounted.current) {
          return;
        }

        const normalizedStart = start.getTime();
        const normalizedEnd = end.getTime();

        const conflictingBooking = (data || []).find((booking: any) => {
          if (!booking.check_in_date || !booking.check_out_date) {
            return false;
          }
          const bookingStart = new Date(booking.check_in_date).getTime();
          const bookingEnd = new Date(booking.check_out_date).getTime();
          return normalizedStart <= bookingEnd && normalizedEnd >= bookingStart;
        });

        if (conflictingBooking) {
          setAvailabilityState("conflict");
          setAvailabilityMessage("This guest already has a booking that overlaps with the selected dates.");
        } else {
          setAvailabilityState("available");
          setAvailabilityMessage("No conflicting visitor bookings detected for these dates.");
        }
      } catch (error) {
        console.error('Failed to verify visitor availability:', error);
        if (!isMounted.current) {
          return;
        }
        setAvailabilityState("conflict");
        setAvailabilityMessage("Unable to verify visitor availability. Please try again.");
      }
    },
    200,
  );

  useEffect(() => {
    const normalizedEmail = guestEmail?.trim() ?? "";

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setAvailabilityState("idle");
      setAvailabilityMessage("");
      debouncedCheckAvailability.cancel();
      return;
    }

    if (!checkInDate || !checkOutDate) {
      setAvailabilityState("idle");
      setAvailabilityMessage("");
      debouncedCheckAvailability.cancel();
      return;
    }

    if (checkOutDate < checkInDate) {
      debouncedCheckAvailability.cancel();
      setAvailabilityState("conflict");
      setAvailabilityMessage("Check-out date must be after the check-in date.");
      form.setError("checkOutDate", {
        type: "manual",
        message: "Check-out date must be after the check-in date.",
      });
      return;
    }

    form.clearErrors("checkOutDate");
    setAvailabilityState("checking");
    setAvailabilityMessage("Checking for overlapping visitor bookings...");
    debouncedCheckAvailability(normalizedEmail, checkInDate, checkOutDate);
  }, [guestEmail, checkInDate, checkOutDate, debouncedCheckAvailability, form]);

  const onSubmit = async (data: VisitorBookingFormData) => {
    if (availabilityState === "checking") {
      toast({
        title: "Checking availability",
        description: "Please wait for the availability check to complete before submitting.",
      });
      return;
    }

    if (availabilityState === "conflict") {
      toast({
        title: "Resolve booking conflict",
        description:
          availabilityMessage ||
          "Please adjust the visitor details before submitting.",
        variant: "destructive",
      });
      return;
    }

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
      debouncedCheckAvailability.cancel();
      setAvailabilityState("idle");
      setAvailabilityMessage("");
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

        {availabilityState !== "idle" && availabilityMessage && (
          <div
            className={cn(
              "rounded-md border p-3 text-sm transition-colors",
              availabilityState === "conflict"
                ? "border-destructive/50 bg-destructive/10 text-destructive"
                : availabilityState === "available"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                  : "border-border bg-muted/50 text-muted-foreground",
            )}
          >
            {availabilityMessage}
          </div>
        )}

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

        <Button
          type="submit"
          disabled={
            isSubmitting ||
            availabilityState === "checking" ||
            availabilityState === "conflict"
          }
          className="w-full"
        >
          {isSubmitting ? "Submitting..." : "Submit Visitor Booking"}
        </Button>
      </form>
    </Form>
  );
}
