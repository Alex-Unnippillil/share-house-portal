BEGIN;

CREATE TABLE public.buildings (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name text NOT NULL,
  description text NULL,
  address_line1 text NULL,
  address_line2 text NULL,
  city text NULL,
  state text NULL,
  postal_code text NULL,
  country text NULL,
  timezone text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.units (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  building_id bigint NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  unit_number text NOT NULL,
  floor text NULL,
  bedroom_count integer NULL,
  bathroom_count integer NULL,
  square_feet integer NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT units_unique_per_building UNIQUE (building_id, unit_number)
);
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_units_building_id ON public.units (building_id);

CREATE TABLE public.carriers (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name text NOT NULL,
  contact_phone text NULL,
  contact_email text NULL,
  website text NULL,
  notes text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.carriers ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX idx_carriers_name_lower ON public.carriers ((lower(name)));

CREATE TABLE public.package_logs (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  building_id bigint NOT NULL REFERENCES public.buildings(id) ON DELETE RESTRICT,
  unit_id bigint NULL REFERENCES public.units(id) ON DELETE SET NULL,
  carrier_id bigint NULL REFERENCES public.carriers(id) ON DELETE SET NULL,
  tracking_number text NULL,
  recipient_name text NOT NULL,
  received_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'received',
  received_at timestamp with time zone NOT NULL DEFAULT now(),
  delivered_at timestamp with time zone NULL,
  notified_at timestamp with time zone NULL,
  picked_up_by text NULL,
  picked_up_contact text NULL,
  picked_up_at timestamp with time zone NULL,
  notes text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT package_logs_status_check CHECK (status IN ('received', 'in_storage', 'notified', 'picked_up', 'returned'))
);
ALTER TABLE public.package_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_package_logs_building_id ON public.package_logs (building_id);
CREATE INDEX idx_package_logs_unit_id ON public.package_logs (unit_id);
CREATE INDEX idx_package_logs_tracking_number ON public.package_logs (tracking_number);

CREATE TABLE public.package_signatures (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  package_log_id bigint NOT NULL REFERENCES public.package_logs(id) ON DELETE CASCADE,
  signer_name text NOT NULL,
  signer_type text NULL,
  signed_at timestamp with time zone NOT NULL DEFAULT now(),
  signature_notes text NULL,
  captured_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL
);
ALTER TABLE public.package_signatures ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_package_signatures_package_log_id ON public.package_signatures (package_log_id);

CREATE TABLE public.visitor_logs (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  building_id bigint NOT NULL REFERENCES public.buildings(id) ON DELETE RESTRICT,
  unit_id bigint NULL REFERENCES public.units(id) ON DELETE SET NULL,
  visitor_name text NOT NULL,
  visitor_type text NULL,
  contact_information text NULL,
  government_id_type text NULL,
  government_id_number text NULL,
  check_in timestamp with time zone NOT NULL DEFAULT now(),
  check_out timestamp with time zone NULL,
  host_name text NULL,
  host_contact text NULL,
  purpose text NULL,
  created_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.visitor_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_visitor_logs_building_id ON public.visitor_logs (building_id);
CREATE INDEX idx_visitor_logs_unit_id ON public.visitor_logs (unit_id);
CREATE INDEX idx_visitor_logs_check_in ON public.visitor_logs (check_in);

CREATE TABLE public.keys (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  building_id bigint NOT NULL REFERENCES public.buildings(id) ON DELETE RESTRICT,
  unit_id bigint NULL REFERENCES public.units(id) ON DELETE SET NULL,
  label text NOT NULL,
  description text NULL,
  status text NOT NULL DEFAULT 'available',
  serial_number text NULL,
  storage_location text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT keys_status_check CHECK (status IN ('available', 'checked_out', 'lost', 'retired'))
);
ALTER TABLE public.keys ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_keys_building_id ON public.keys (building_id);
CREATE INDEX idx_keys_unit_id ON public.keys (unit_id);
CREATE UNIQUE INDEX idx_keys_building_label ON public.keys (building_id, label);

CREATE TABLE public.key_transactions (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  key_id bigint NOT NULL REFERENCES public.keys(id) ON DELETE CASCADE,
  building_id bigint NULL REFERENCES public.buildings(id) ON DELETE SET NULL,
  unit_id bigint NULL REFERENCES public.units(id) ON DELETE SET NULL,
  transaction_type text NOT NULL,
  occurred_at timestamp with time zone NOT NULL DEFAULT now(),
  handled_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  recipient_name text NULL,
  recipient_contact text NULL,
  due_at timestamp with time zone NULL,
  returned_at timestamp with time zone NULL,
  notes text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT key_transactions_transaction_type_check CHECK (transaction_type IN ('checkout', 'return', 'audit', 'other'))
);
ALTER TABLE public.key_transactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_key_transactions_key_id ON public.key_transactions (key_id);
CREATE INDEX idx_key_transactions_building_id ON public.key_transactions (building_id);
CREATE INDEX idx_key_transactions_unit_id ON public.key_transactions (unit_id);

CREATE TABLE public.shift_logs (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  building_id bigint NOT NULL REFERENCES public.buildings(id) ON DELETE RESTRICT,
  shift_date date NOT NULL,
  shift_start timestamp with time zone NULL,
  shift_end timestamp with time zone NULL,
  staff_profile_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  handoff_profile_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  summary text NULL,
  handoff_notes text NULL,
  issues text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.shift_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_shift_logs_building_id ON public.shift_logs (building_id);
CREATE INDEX idx_shift_logs_shift_date ON public.shift_logs (shift_date);

CREATE TABLE public.incident_reports (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  building_id bigint NOT NULL REFERENCES public.buildings(id) ON DELETE RESTRICT,
  unit_id bigint NULL REFERENCES public.units(id) ON DELETE SET NULL,
  shift_log_id bigint NULL REFERENCES public.shift_logs(id) ON DELETE SET NULL,
  reported_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  reported_at timestamp with time zone NOT NULL DEFAULT now(),
  incident_time timestamp with time zone NULL,
  incident_type text NULL,
  severity text NULL,
  description text NOT NULL,
  actions_taken text NULL,
  follow_up_actions text NULL,
  status text NOT NULL DEFAULT 'open',
  closed_at timestamp with time zone NULL,
  follow_up_at timestamp with time zone NULL,
  notes text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT incident_reports_status_check CHECK (status IN ('open', 'in_progress', 'closed'))
);
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_incident_reports_building_id ON public.incident_reports (building_id);
CREATE INDEX idx_incident_reports_unit_id ON public.incident_reports (unit_id);

CREATE TABLE public.attachments (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  entity_type text NOT NULL,
  entity_id bigint NOT NULL,
  s3_bucket text NOT NULL,
  s3_key text NOT NULL,
  file_name text NULL,
  content_type text NULL,
  file_size bigint NULL,
  uploaded_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NULL,
  retention_expires_at timestamp with time zone NULL,
  notes text NULL,
  CONSTRAINT attachments_entity_type_check CHECK (entity_type IN ('package_log', 'package_signature', 'visitor_log', 'incident_report', 'key_transaction', 'shift_log')),
  CONSTRAINT attachments_s3_key_key UNIQUE (s3_key)
);
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_attachments_entity ON public.attachments (entity_type, entity_id);
CREATE INDEX idx_attachments_uploaded_by ON public.attachments (uploaded_by);

COMMIT;
