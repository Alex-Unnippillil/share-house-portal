-- Create KPI cache table to store aggregated dashboard metrics
CREATE TABLE public.kpi_cache (
  key TEXT PRIMARY KEY,
  scope TEXT NOT NULL DEFAULT 'global',
  payload JSONB NOT NULL,
  computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  compute_duration_ms INTEGER,
  source TEXT NOT NULL DEFAULT 'manual',
  error TEXT
);

CREATE INDEX idx_kpi_cache_scope ON public.kpi_cache(scope);
CREATE INDEX idx_kpi_cache_expires_at ON public.kpi_cache(expires_at);

ALTER TABLE public.kpi_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read KPI cache"
  ON public.kpi_cache
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Function that aggregates operational KPIs for the dashboard
CREATE OR REPLACE FUNCTION public.calculate_dashboard_kpis()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rent_collected_this_month NUMERIC;
  overdue_payments_count INTEGER;
  active_leases_count INTEGER;
  open_maintenance_count INTEGER;
  upcoming_visitors_count INTEGER;
  pending_documents_count INTEGER;
  response JSONB;
BEGIN
  SELECT COALESCE(SUM(amount), 0)::NUMERIC / 100
    INTO rent_collected_this_month
  FROM public.rent_payments
  WHERE status IN ('succeeded', 'completed')
    AND date_trunc('month', COALESCE(processed_at, created_at)) = date_trunc('month', NOW());

  SELECT COUNT(*)
    INTO overdue_payments_count
  FROM public.rent_payments
  WHERE status IN ('pending', 'failed');

  SELECT COUNT(*)
    INTO active_leases_count
  FROM public.leases
  WHERE status = 'active';

  SELECT COUNT(*)
    INTO open_maintenance_count
  FROM public.maintenance_requests
  WHERE status IN ('pending', 'in_progress');

  SELECT COUNT(*)
    INTO upcoming_visitors_count
  FROM public.visitor_logs
  WHERE status IN ('pending', 'approved')
    AND check_in_date >= NOW()
    AND check_in_date < NOW() + INTERVAL '7 days';

  SELECT COUNT(*)
    INTO pending_documents_count
  FROM public.documents
  WHERE requires_signature IS TRUE
    AND status IN ('draft', 'pending_signature');

  response := jsonb_build_object(
    'totalRentCollectedThisMonth', COALESCE(rent_collected_this_month, 0),
    'overdueRentPayments', COALESCE(overdue_payments_count, 0),
    'activeLeases', COALESCE(active_leases_count, 0),
    'openMaintenanceRequests', COALESCE(open_maintenance_count, 0),
    'upcomingVisitorsNext7Days', COALESCE(upcoming_visitors_count, 0),
    'pendingDocumentsAwaitingSignature', COALESCE(pending_documents_count, 0)
  );

  RETURN response;
END;
$$;

COMMENT ON FUNCTION public.calculate_dashboard_kpis IS 'Aggregates frequently used dashboard KPIs for caching and realtime display.';
