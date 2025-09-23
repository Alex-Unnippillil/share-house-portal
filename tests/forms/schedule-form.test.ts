import { addHours } from "date-fns";
import { describe, expect, it } from "vitest";

import { clientScheduleSchema } from "@/components/schedule-form";

describe("schedule form validation", () => {
  it("requires both a date and time selection", () => {
    const result = clientScheduleSchema.safeParse({});

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.startDateTime).toContain(
      "Please select both a date and a time slot.",
    );
  });

  it("prevents booking past time slots", () => {
    const result = clientScheduleSchema.safeParse({
      startDateTime: addHours(new Date(), -1),
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.startDateTime).toContain(
      "The selected time slot has already passed. Please select a future time.",
    );
  });

  it("accepts future selections", () => {
    const result = clientScheduleSchema.safeParse({
      startDateTime: addHours(new Date(), 2),
    });

    expect(result.success).toBe(true);
  });
});
