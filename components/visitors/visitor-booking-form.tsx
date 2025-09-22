"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/use-notifications";
import { createClient } from "@/utils/supabase-browser";
import { useToast } from "@/components/ui/use-toast";
import {
  fetchMemberProfile,
  fetchMembersByUnit,
  type MemberProfile,
} from "@/lib/data/members";
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client";
import { Checkbox } from "@/components/ui/checkbox";

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
  roommateApprovals: z.array(z.string()).default([]),
}).refine(
  (data) => data.checkOutDate > data.checkInDate,
  {
    message: "Check-out date must be after check-in date",
    path: ["checkOutDate"],
  }
);

type VisitorBookingFormData = z.infer<typeof visitorBookingSchema>;

export function VisitorBookingForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hostProfile, setHostProfile] = useState<MemberProfile | null>(null);
  const [hostUserId, setHostUserId] = useState<string | null>(null);
  const [roommates, setRoommates] = useState<MemberProfile[]>([]);
  const [propertyManager, setPropertyManager] = useState<MemberProfile | null>(null);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [membersError, setMembersError] = useState<string | null>(null);
  const { notifyVisitorBooking } = useNotifications();
  const { toast } = useToast();
  const supabase = useMemo(() => createClient(), []);
  const typedSupabase = useMemo(
    () => supabase as unknown as TypedSupabaseClient,
    [supabase]
  );

  const form = useForm<VisitorBookingFormData>({
    resolver: zodResolver(visitorBookingSchema),
    defaultValues: {
      guestName: "",
      guestEmail: "",
      guestPhone: "",
      purpose: "",
      emergencyContact: "",
      specialNotes: "",
      roommateApprovals: [],
    },
  });

  useEffect(() => {
    let isActive = true;

    const loadMemberData = async () => {
      setIsLoadingMembers(true);
      setMembersError(null);

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
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

        const unitMembers = await fetchMembersByUnit(typedSupabase, profile.unit_id, {
          excludeUserId: user.id,
        });

        if (!isActive) {
          return;
        }

        const roommateMembers = unitMembers.filter(
          (member) => member.role === "tenant" || member.role === "roommate"
        );
        const managerMember =
          unitMembers.find((member) => member.role === "property_manager") ?? null;

        setHostProfile(profile);
        setHostUserId(user.id);
        setRoommates(roommateMembers);
        setPropertyManager(managerMember);

        if (!managerMember) {
          setMembersError(
            "No property manager is assigned to your unit. Visitor approvals cannot be submitted until one is added."
          );
        }

        form.setValue(
          "roommateApprovals",
          roommateMembers.map((member) => member.id),
          { shouldValidate: true }
        );
        form.clearErrors("roommateApprovals");
      } catch (error) {
        if (!isActive) {
          return;
        }

        console.error("Error loading member data:", error);
        setMembersError(
          error instanceof Error
            ? error.message
            : "Failed to load household members"
        );
      } finally {
        if (isActive) {
          setIsLoadingMembers(false);
        }
      }
    };

    void loadMemberData();

    return () => {
      isActive = false;
    };
  }, [form, supabase, typedSupabase]);

  const onSubmit = async (data: VisitorBookingFormData) => {
    setIsSubmitting(true);

    try {
      if (!hostUserId || !hostProfile) {
        throw new Error("Unable to determine host information. Please refresh and try again.");
      }

      if (!propertyManager) {
        throw new Error("Property manager not found for this unit");
      }

      const selectedRoommateIds = data.roommateApprovals ?? [];

      if (roommates.length > 0 && selectedRoommateIds.length === 0) {
        form.setError("roommateApprovals", {
          type: "manual",
          message: "Select at least one roommate to request approval from.",
        });
        return;
      }

      // Create visitor booking record
      const { data: booking, error: bookingError } = await (supabase as any)
        .from('visitor_logs')
        .insert({
          guest_name: data.guestName,
          guest_email: data.guestEmail,
          guest_phone: data.guestPhone,
          host_id: hostUserId,
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

      if (booking && selectedRoommateIds.length > 0) {
        const { error: approvalsError } = await (supabase as any)
          .from('visitor_approvals')
          .insert(
            selectedRoommateIds.map((roommateId) => ({
              visitor_log_id: booking.id,
              roommate_id: roommateId,
              status: 'pending',
            }))
          );

        if (approvalsError) throw approvalsError;
      }

      const roommatesToNotify = roommates.filter((roommate) =>
        (data.roommateApprovals ?? []).includes(roommate.id)
      );

      // Send notifications
      await notifyVisitorBooking({
        guestName: data.guestName,
        hostName: hostProfile.full_name || hostProfile.email || 'Unknown',
        checkInDate: format(data.checkInDate, 'MMM dd, yyyy'),
        checkOutDate: format(data.checkOutDate, 'MMM dd, yyyy'),
        purpose: data.purpose,
        roommates: roommatesToNotify.map(r => ({
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
        description:
          roommatesToNotify.length > 0
            ? `Your visitor booking has been submitted. Approval requests were sent to ${roommatesToNotify.length} roommate${
                roommatesToNotify.length > 1 ? 's' : ''
              }.`
            : "Your visitor booking has been submitted and the property manager has been notified.",
      });

      form.reset();
      if (roommates.length > 0) {
        form.setValue(
          'roommateApprovals',
          roommates.map((roommate) => roommate.id),
          { shouldValidate: true }
        );
      }
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
        {membersError ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {membersError}
          </div>
        ) : null}

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
          name="roommateApprovals"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Roommate Approvals</FormLabel>
              <FormDescription>
                Select the roommates who need to approve this overnight stay. Everyone you
                select will receive an in-app notification with the request.
              </FormDescription>
              <div className="space-y-3">
                {isLoadingMembers ? (
                  <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                    Loading household members...
                  </div>
                ) : roommates.length === 0 ? (
                  <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                    No roommates are assigned to your unit, so no approvals are required.
                  </div>
                ) : (
                  roommates.map((roommate) => {
                    const isSelected = field.value?.includes(roommate.id) ?? false;

                    return (
                      <label
                        key={roommate.id}
                        className="flex items-start gap-3 rounded-md border p-3"
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            const currentValue = field.value ?? [];
                            const nextValue = checked
                              ? [...currentValue, roommate.id]
                              : currentValue.filter((id) => id !== roommate.id);
                            field.onChange(nextValue);
                          }}
                          disabled={isSubmitting}
                        />
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {roommate.full_name || roommate.email || "Unknown roommate"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Approval request will be sent to this roommate.
                          </p>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

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
          disabled={isSubmitting || isLoadingMembers || !!membersError}
          className="w-full"
        >
          {isSubmitting ? "Submitting..." : "Submit Visitor Booking"}
        </Button>
      </form>
    </Form>
  );
}
