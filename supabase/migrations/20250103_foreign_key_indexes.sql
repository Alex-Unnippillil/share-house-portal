-- Add supporting indexes for frequently joined foreign keys
CREATE INDEX IF NOT EXISTS idx_profiles_user_id
  ON public.profiles USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_units_property_id
  ON public.units USING btree (property_id);

CREATE INDEX IF NOT EXISTS idx_leases_unit_id
  ON public.leases USING btree (unit_id);

CREATE INDEX IF NOT EXISTS idx_rent_payments_tenant_id
  ON public.rent_payments USING btree (tenant_id);
