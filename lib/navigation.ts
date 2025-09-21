import type { BuildingRole } from "@/types/auth";
import type { NavItem } from "@/types/nav";

type FilterNavItemsArgs = {
  items: NavItem[];
  isAuthenticated: boolean;
  activeRole: BuildingRole | null;
  hasActiveMembership: boolean;
};

export function filterNavItems({
  items,
  isAuthenticated,
  activeRole,
  hasActiveMembership,
}: FilterNavItemsArgs): NavItem[] {
  return items.filter((item) => {
    if (item.requiresAuth && !isAuthenticated) {
      return false;
    }

    if (item.requireActiveMembership && !hasActiveMembership) {
      return false;
    }

    if (item.allowedRoles && item.allowedRoles.length > 0) {
      if (!activeRole || !item.allowedRoles.includes(activeRole)) {
        return false;
      }
    }

    return true;
  });
}
