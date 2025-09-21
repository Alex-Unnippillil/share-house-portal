const STAFF_ROLES = new Set([
  "staff",
  "admin",
  "manager",
  "property_manager",
]);

export function isStaffRole(role: string | null | undefined) {
  if (!role) {
    return false;
  }

  return STAFF_ROLES.has(role.toLowerCase());
}

export { STAFF_ROLES };
