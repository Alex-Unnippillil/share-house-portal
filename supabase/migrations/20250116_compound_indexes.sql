-- disable-transaction
-- Optimize member, chore, and invoice filters for building-scoped workflows

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_member_households_building_member
  ON public.member_households (building_id, member_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_member_households_building_household
  ON public.member_households (building_id, household_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chore_assignments_building_assigned_status_due
  ON public.chore_assignments (building_id, assigned_to, status, due_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chore_assignments_building_household_due
  ON public.chore_assignments (building_id, household_id, due_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_building_tenant_status_due
  ON public.invoices (building_id, tenant_id, status, due_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_building_household_due
  ON public.invoices (building_id, household_id, due_date DESC);
