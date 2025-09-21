import { describe, expect, it } from "vitest";

import {
        getCapabilities,
        getNavGroupsForRole,
        normalizeRole,
        ROLE_DEFINITIONS,
} from "@/config/rbac";

const flattenNav = (role: string) =>
        getNavGroupsForRole(role).flatMap((group) => group.items.map((item) => item.href));

describe("RBAC configuration", () => {
        it("normalises unknown roles to resident", () => {
                expect(normalizeRole(undefined)).toBe("resident");
                expect(normalizeRole("invalid" as string)).toBe("resident");
        });

        it("grants residents access to their workspace only", () => {
                const links = flattenNav("resident");
                expect(links).toContain("/dashboard");
                expect(links).toContain("/dashboard/todo");
                expect(links).not.toContain("/dashboard/members");
                expect(links.every((href) => !href.includes("#"))).toBe(true);
        });

        it("includes admin anchors for house managers", () => {
                const links = flattenNav("house_manager");
                expect(links).toContain("/dashboard#amenities");
                expect(links).toContain("/dashboard#booking-calendar");
                expect(links).toContain("/dashboard#payments-ledger");
                expect(links).toContain("/dashboard/members");
        });

        it("aligns capabilities with role definitions", () => {
                for (const role of ROLE_DEFINITIONS.map((definition) => definition.role)) {
                        const capabilities = getCapabilities(role);
                        if (role === "resident") {
                                expect(capabilities.canManageMembers).toBe(false);
                        } else {
                                expect(capabilities.canManageMembers).toBe(true);
                        }
                        expect(capabilities.canManageTodos).toBe(true);
                }
        });
});
