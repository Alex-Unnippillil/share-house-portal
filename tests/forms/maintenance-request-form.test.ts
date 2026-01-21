import { describe, expect, it } from "vitest";

import { maintenanceRequestSchema } from "@/components/maintenance/maintenance-request-form";

const basePayload = {
  title: "Broken kitchen sink",
  description: "Water has been leaking continuously for two days causing puddles.",
  priority: "normal" as const,
};

describe("maintenance request form validation", () => {
  it("requires a descriptive title", () => {
    const result = maintenanceRequestSchema.safeParse({
      ...basePayload,
      title: "Drip",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.title).toContain(
      "Title must be at least 5 characters",
    );
  });

  it("requires a detailed description", () => {
    const result = maintenanceRequestSchema.safeParse({
      ...basePayload,
      description: "Leaking pipe",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.description).toContain(
      "Description must be at least 20 characters",
    );
  });

  it("rejects unsupported priorities", () => {
    const result = maintenanceRequestSchema.safeParse({
      ...basePayload,
      priority: "impossible" as any,
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.priority).toContain(
      "Please choose a priority level.",
    );
  });
});
