-- Subprocessor catalog, subscription management, and change log
CREATE TABLE public.subprocessors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  services TEXT[] DEFAULT '{}',
  data_types TEXT[] DEFAULT '{}',
  data_location TEXT,
  lawful_basis TEXT,
  dpa_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  review_frequency TEXT DEFAULT 'annual',
  last_reviewed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

CREATE TABLE public.subprocessor_change_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  effective_at DATE NOT NULL,
  changes JSONB NOT NULL DEFAULT '[]',
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

CREATE TABLE public.subprocessor_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
  confirmation_token TEXT,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

-- Seed current subprocessors
INSERT INTO public.subprocessors
  (name, category, description, services, data_types, data_location, lawful_basis, dpa_url, review_frequency)
VALUES
  (
    'Supabase',
    'Infrastructure & Database',
    'Managed Postgres database, authentication, storage, and realtime services powering Roomsily.',
    ARRAY['Managed Postgres database', 'Authentication and user management', 'Storage buckets for documents and avatars', 'Realtime channels for messaging'],
    ARRAY['Tenant profiles', 'Household assignments', 'Amenity bookings', 'Maintenance requests', 'Visitor logs', 'Document metadata'],
    'United States (primary) with optional EU-West replica',
    'Contractual necessity and legitimate interest for secure platform operations',
    'https://supabase.com/privacy-policy',
    'annual'
  ),
  (
    'Stripe',
    'Payments',
    'Processes rent payments, maintains subscription billing schedules, and issues receipts.',
    ARRAY['Recurring payment orchestration', 'Billing schedule management', 'Invoice generation'],
    ARRAY['Payer name', 'Email address', 'Billing address', 'Stripe customer identifier', 'Payment method fingerprint (tokenized)', 'Invoice history'],
    'United States and European Union data centers',
    'Contractual necessity for rent collection and compliance with financial regulations',
    'https://stripe.com/legal/dpa',
    'annual'
  ),
  (
    'Documenso',
    'Document Workflow',
    'Delivers digital lease templates, captures signatures, and preserves audit trails.',
    ARRAY['Document templating', 'Signature routing', 'Certificate generation'],
    ARRAY['Lease templates', 'Signer names', 'Signer email addresses', 'Signature certificates', 'Signature timestamps'],
    'European Union (primary) with redundancy in Germany',
    'Contractual necessity for executing lease agreements',
    'https://www.documenso.com/security',
    'annual'
  ),
  (
    'Cal.com',
    'Scheduling',
    'Provides amenity booking calendars, conflict resolution, and webhook notifications.',
    ARRAY['Amenity scheduling', 'Booking conflict prevention', 'Webhook event delivery'],
    ARRAY['Booking titles', 'Participant names', 'Participant email addresses', 'Reservation timestamps', 'Optional booking notes'],
    'European Union and United States regions',
    'Legitimate interest in coordinating shared amenities',
    'https://cal.com/security',
    'annual'
  ),
  (
    'Resend',
    'Communications',
    'Delivers transactional emails for onboarding, rent receipts, maintenance updates, and compliance alerts.',
    ARRAY['Transactional email delivery', 'Bounce and event tracking'],
    ARRAY['Recipient email address', 'Notification subject', 'Rendered email content', 'Delivery event metadata'],
    'United States with EU relay support',
    'Legitimate interest in providing tenant notifications and contractual necessity for policy updates',
    'https://resend.com/legal/privacy-policy',
    'semi-annual'
  ),
  (
    'Vercel',
    'Hosting & Observability',
    'Hosts the Share House Portal, provides build pipelines, CDN caching, and runtime logging.',
    ARRAY['Application hosting', 'Content delivery network', 'Serverless observability'],
    ARRAY['Deployment artifacts', 'Request metadata', 'Performance traces', 'Runtime logs'],
    'Global edge network with primary infrastructure in the United States and European Union',
    'Legitimate interest in secure platform delivery',
    'https://vercel.com/security',
    'annual'
  );

-- Seed historical change log entries
INSERT INTO public.subprocessor_change_log (title, summary, effective_at, changes)
VALUES
  (
    'Resend engaged for transactional email delivery',
    'We brought Resend online as our dedicated transactional email provider for all roommate- and compliance-facing messages.',
    DATE '2025-02-10',
    '[
      {
        "vendor": "Resend",
        "change": "New subprocessor engaged for onboarding, payment receipt, and policy notifications.",
        "dataImpacts": [
          "Tenant and property manager email addresses",
          "Notification content and metadata"
        ],
        "action": "No tenant action required; expect improved deliverability and visibility into bounce events."
      }
    ]'
  ),
  (
    'Cal.com retention window reduced to 18 months',
    'Cal.com booking metadata is now automatically purged after 18 months to reinforce data minimisation.',
    DATE '2024-11-01',
    '[
      {
        "vendor": "Cal.com",
        "change": "Shortened retention window for amenity booking metadata to 18 months.",
        "dataImpacts": [
          "Amenity reservation history"
        ],
        "action": "Export bookings older than 18 months if long-term archival is required."
      }
    ]'
  ),
  (
    'Supabase replica expanded to EU-West',
    'Activated an EU-West read replica and enhanced PITR coverage to improve latency and resiliency for European tenants.',
    DATE '2024-09-15',
    '[
      {
        "vendor": "Supabase",
        "change": "Provisioned EU-West replica and extended point-in-time recovery to 14 days.",
        "dataImpacts": [
          "Tenant profiles",
          "Maintenance requests",
          "Visitor registrations"
        ],
        "action": "No action required; roommates in the EU should see lower latency."
      }
    ]'
  );

-- Helpful indexes
CREATE INDEX idx_subprocessors_status ON public.subprocessors(status);
CREATE INDEX idx_subprocessors_name ON public.subprocessors(name);
CREATE INDEX idx_subprocessor_change_log_effective_at ON public.subprocessor_change_log(effective_at DESC);
CREATE INDEX idx_subprocessor_subscriptions_status ON public.subprocessor_subscriptions(status);

-- Enable Row Level Security policies
ALTER TABLE public.subprocessors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subprocessor_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subprocessor_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to subprocessors" ON public.subprocessors
  FOR SELECT
  USING (true);

CREATE POLICY "Public read access to subprocessor change log" ON public.subprocessor_change_log
  FOR SELECT
  USING (true);

-- Reuse existing trigger helper
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subprocessors_updated_at
  BEFORE UPDATE ON public.subprocessors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subprocessor_change_log_updated_at
  BEFORE UPDATE ON public.subprocessor_change_log
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subprocessor_subscriptions_updated_at
  BEFORE UPDATE ON public.subprocessor_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
