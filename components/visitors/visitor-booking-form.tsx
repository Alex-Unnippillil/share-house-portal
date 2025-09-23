"use client";

import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
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
import { createClient } from "@/utils/supabase-browser";
import { useToast } from "@/components/ui/use-toast";
import { fetchMemberProfile, fetchMembersByUnit } from "@/lib/data/members";
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { OptimisticContext } from "@/lib/optimistic";
import { finalizeOptimisticUpdate, rollbackOptimisticUpdate, startOptimisticUpdate } from "@/lib/optimistic";

void React;

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

type VisitorBookingCacheItem = {
  id: string;
  guestName: string;
  status: string;
  checkInDate: string;
  checkOutDate: string;
};

interface VisitorBookingFormProps {
  initialValues?: Partial<VisitorBookingFormData>;
}

interface VisitorMutationContext {
  optimisticContext: OptimisticContext<VisitorBookingCacheItem[]>;
  optimisticBooking: VisitorBookingCacheItem;
}

export function VisitorBookingForm({ initialValues }: VisitorBookingFormProps = {}) {
  const [optimisticMessage, setOptimisticMessage] = useState<string | null>(null);
  const { notifyVisitorBooking } = useNotifications();
  const { toast } = useToast();
  const supabase = createClient();
  const typedSupabase = supabase as unknown as TypedSupabaseClient;
  const queryClient = useQueryClient();

  const defaultValues = useMemo(
    () => ({
      guestName: initialValues?.guestName ?? "",
      guestEmail: initialValues?.guestEmail ?? "",
      guestPhone: initialValues?.guestPhone ?? "",
      purpose: initialValues?.purpose ?? "",
      emergencyContact: initialValues?.emergencyContact ?? "",
      specialNotes: initialValues?.specialNotes ?? "",
      checkInDate: initialValues?.checkInDate ?? undefined,
      checkOutDate: initialValues?.checkOutDate ?? undefined,
    }),
    [initialValues],
  );

  const form = useForm<VisitorBookingFormData>({
    resolver: zodResolver(visitorBookingSchema),
    defaultValues,
  });

  const visitorMutation = useMutation<any, Error, VisitorBookingFormData, VisitorMutationContext>({
    mutationFn: async (data) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const profile = await fetchMemberProfile(typedSupabase, user.id);
      if (!profile) throw new Error("Profile not found");
      if (!profile.unit_id) {
        throw new Error("User is not assigned to a unit");
      }

      const unitMembers = await fetchMembersByUnit(typedSupabase, profile.unit_id, {
        excludeUserId: user.id,
      });

      const roommates = unitMembers.filter(
        member => member.role === 'tenant' || member.role === 'roommate'
      );
      const propertyManager = unitMembers.find(member => member.role === 'property_manager');

      if (!propertyManager) {
        throw new Error("Property manager not found for this unit");
      }

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

      if (bookingError) {
        throw new Error(bookingError.message ?? 'Failed to submit visitor booking');
      }

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

      return booking;
    },
    onMutate: (data) => {
      const optimisticBooking = createOptimisticVisitorBooking(data);
      const optimisticContext = startOptimisticUpdate<VisitorBookingCacheItem[]>({
        queryClient,
        filters: { queryKey: ['visitor-bookings'] },
        operation: 'create-visitor-booking',
        updateFn: (current = []) => [optimisticBooking, ...current],
      });

      setOptimisticMessage('Visitor booking submitted. Syncing with server...');

      return { optimisticContext, optimisticBooking } satisfies VisitorMutationContext;
    },
    onError: (error, _variables, context) => {
      rollbackOptimisticUpdate(queryClient, context?.optimisticContext, error);
      setOptimisticMessage(null);

      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit visitor booking",
        variant: "destructive",
      });
    },
    onSuccess: (booking, _variables, context) => {
      const cacheItem = toVisitorBookingCacheItem(booking);
      finalizeOptimisticUpdate<VisitorBookingCacheItem[]>({
        queryClient,
        context: context?.optimisticContext,
        reconcileFn: (current) => {
          if (!current) return current;
          const placeholderId = context?.optimisticBooking.id;
          const hasPlaceholder = current.some(item => item.id === placeholderId);
          const next = current.map(item => item.id === placeholderId ? cacheItem : item);
          return hasPlaceholder ? next : [cacheItem, ...current];
        },
      });

      setOptimisticMessage('Visitor booking synced successfully.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['visitor-bookings'] });
    },
  });

  const onSubmit = async (data: VisitorBookingFormData) => {
    try {
      await visitorMutation.mutateAsync(data, {
        onSuccess: () => {
          toast({
            title: "Visitor booking submitted",
            description: "Your visitor booking has been submitted and notifications sent.",
          });
          form.reset(defaultValues);
        },
      });
    } catch (error) {
      console.error('Error submitting visitor booking:', error);
    }
  };

  const isSubmitting = visitorMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {optimisticMessage && (
          <div className="rounded-md border border-primary/20 bg-primary/10 p-3 text-sm text-primary">
            {optimisticMessage}
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

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Submitting..." : "Submit Visitor Booking"}
        </Button>
      </form>
    </Form>
  );
}

function createOptimisticVisitorBooking(
  data: VisitorBookingFormData,
): VisitorBookingCacheItem {
  const created_at = new Date().toISOString();
  return {
    id: `temp-visitor-${created_at}`,
    guestName: data.guestName,
    status: 'pending',
    checkInDate: data.checkInDate.toISOString(),
    checkOutDate: data.checkOutDate.toISOString(),
  };
}

function toVisitorBookingCacheItem(booking: any): VisitorBookingCacheItem {
  return {
    id: booking.id,
    guestName: booking.guest_name ?? booking.guestName ?? 'Guest',
    status: booking.status ?? 'pending',
    checkInDate: booking.check_in_date ?? booking.checkInDate ?? new Date().toISOString(),
    checkOutDate: booking.check_out_date ?? booking.checkOutDate ?? new Date().toISOString(),
  };
}
