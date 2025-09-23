import { describe, expect, it } from "vitest";

import { visitorBookingSchema } from "@/components/visitors/visitor-booking-form";

const basePayload = {
  guestName: "Alex Guest",
  guestEmail: "alex@example.com",
  guestPhone: "",
  checkInDate: new Date("2024-07-01"),
  checkOutDate: new Date("2024-07-03"),
  purpose: "Catching up with family over the long weekend.",
};

describe("visitor booking form validation", () => {
  it("requires a guest name", () => {
    const result = visitorBookingSchema.safeParse({
      ...basePayload,
      guestName: "A",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.guestName).toContain(
      "Guest name must be at least 2 characters",
    );
  });

  it("validates the guest email", () => {
    const result = visitorBookingSchema.safeParse({
      ...basePayload,
      guestEmail: "not-an-email",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.guestEmail).toContain(
      "Please enter a valid email address",
    );
  });

  it("requires a check-in date", () => {
    const { checkInDate, ...withoutCheckIn } = basePayload;
    const result = visitorBookingSchema.safeParse({
      ...withoutCheckIn,
    } as any);

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.checkInDate).toContain(
      "Check-in date is required",
    );
  });

  it("asks for more detail on the purpose field", () => {
    const result = visitorBookingSchema.safeParse({
      ...basePayload,
      purpose: "Hangout",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.purpose).toContain(
      "Please provide more details about the visit",
    );
  });
});
