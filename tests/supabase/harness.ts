import { PGlite } from '@electric-sql/pglite'
import type { SupabaseAppRole } from './helpers/jwt'
import { signServiceRoleJwt } from './helpers/jwt'

export interface TestActor {
  id: string
  email?: string
  fullName?: string
  unitId?: string
  appRole: SupabaseAppRole
}

const ROLE_DEFINITION_SQL = `
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOINHERIT;
  END IF;
END
$$;
`

const GEN_RANDOM_UUID_SQL = `
CREATE OR REPLACE FUNCTION public.gen_random_uuid()
RETURNS uuid AS $$
  SELECT (
    lpad(to_hex((random() * 4294967295)::bigint), 8, '0') || '-' ||
    lpad(to_hex((random() * 65535)::bigint), 4, '0') || '-' ||
    '4' || right(lpad(to_hex((random() * 65535)::bigint), 4, '0'), 3) || '-' ||
    substr('89ab', (floor(random() * 4)::int + 1), 1) || right(lpad(to_hex((random() * 65535)::bigint), 4, '0'), 3) || '-' ||
    lpad(to_hex((random() * 281474976710655)::bigint), 12, '0')
  )::uuid;
$$ LANGUAGE SQL IMMUTABLE;
`

const AUTH_SCHEMA_STATEMENTS = [
  'CREATE SCHEMA IF NOT EXISTS auth',
  `CREATE TABLE IF NOT EXISTS auth.users (
    id uuid PRIMARY KEY,
    email text,
    raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
  )`,
]

const PROFILES_STATEMENT = `
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  role text NOT NULL CHECK (role IN ('tenant', 'roommate', 'property_manager', 'admin')),
  unit_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)
`

const AUTH_UID_FUNCTION_SQL = `
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid AS $$
  DECLARE
    jwt_claims text;
  BEGIN
    jwt_claims := current_setting('request.jwt.claims', true);
    IF jwt_claims IS NULL OR jwt_claims = '' THEN
      RETURN NULL;
    END IF;
    RETURN (jwt_claims::jsonb ->> 'sub')::uuid;
  END;
$$ LANGUAGE plpgsql STABLE;
`

const UPDATED_AT_FUNCTION_SQL = `
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`

const RENT_PAYMENTS_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS public.rent_payments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_payment_intent_id text UNIQUE,
    stripe_customer_id text,
    amount integer NOT NULL,
    currency text NOT NULL DEFAULT 'usd',
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled')),
    payment_method text,
    description text,
    receipt_url text,
    metadata jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  )`,
  `ALTER TABLE public.rent_payments ENABLE ROW LEVEL SECURITY`,
  `CREATE POLICY "Users can view their own rent payments" ON public.rent_payments FOR SELECT USING (auth.uid() = user_id)`,
  `CREATE POLICY "Property managers can view all rent payments" ON public.rent_payments FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('property_manager', 'admin')))`,
  `CREATE TRIGGER update_rent_payments_updated_at BEFORE UPDATE ON public.rent_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,
]

const NOTIFICATIONS_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
    action_url text,
    metadata jsonb,
    read boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  )`,
  `ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY`,
  `CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id)`,
  `CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id)`,
  `CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,
]

const EMAIL_NOTIFICATIONS_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS public.email_notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient text NOT NULL,
    subject text NOT NULL,
    template text NOT NULL,
    status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
    sent_at timestamptz DEFAULT now(),
    error_message text,
    metadata jsonb
  )`,
  `ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY`,
  `CREATE POLICY "Users can view their own email notifications" ON public.email_notifications FOR SELECT USING (auth.uid() = user_id)`
]

export class SupabaseTestHarness {
  private constructor(public readonly db: PGlite) {}

  static async create(): Promise<SupabaseTestHarness> {
    const db = new PGlite()
    const harness = new SupabaseTestHarness(db)
    await harness.setup()
    return harness
  }

  private async setup() {
    await this.db.query(GEN_RANDOM_UUID_SQL)
    for (const statement of AUTH_SCHEMA_STATEMENTS) {
      await this.db.query(statement)
    }
    await this.db.query(PROFILES_STATEMENT)
    await this.db.query(AUTH_UID_FUNCTION_SQL)
    await this.db.query(UPDATED_AT_FUNCTION_SQL)
    for (const statement of RENT_PAYMENTS_STATEMENTS) {
      await this.db.query(statement)
    }
    for (const statement of NOTIFICATIONS_STATEMENTS) {
      await this.db.query(statement)
    }
    for (const statement of EMAIL_NOTIFICATIONS_STATEMENTS) {
      await this.db.query(statement)
    }
    await this.db.query(ROLE_DEFINITION_SQL)

    await this.db.query('GRANT USAGE ON SCHEMA public TO authenticated;')
    await this.db.query('GRANT SELECT ON public.profiles TO authenticated;')
    await this.db.query('GRANT SELECT, INSERT, UPDATE ON public.rent_payments TO authenticated;')
    await this.db.query('GRANT SELECT, UPDATE ON public.notifications TO authenticated;')
    await this.db.query('GRANT SELECT ON public.email_notifications TO authenticated;')
  }

  async reset() {
    await this.db.query('DELETE FROM public.rent_payments;')
    await this.db.query('DELETE FROM public.notifications;')
    await this.db.query('DELETE FROM public.email_notifications;')
    await this.db.query('DELETE FROM public.profiles;')
    await this.db.query('DELETE FROM auth.users;')
  }

  async close() {
    await this.db.close()
  }

  async insertActor(actor: TestActor) {
    await this.db.query(
      `INSERT INTO auth.users (id, email, raw_user_meta_data)
       VALUES ($1, $2, COALESCE($3::jsonb, '{}'::jsonb))`,
      [actor.id, actor.email ?? null, actor.appRole ? JSON.stringify({ role: actor.appRole }) : null],
    )
    await this.db.query(
      `INSERT INTO public.profiles (id, email, full_name, role, unit_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [actor.id, actor.email ?? null, actor.fullName ?? null, actor.appRole, actor.unitId ?? null],
    )
  }

  async withAuthContext<T>(actor: TestActor, fn: () => Promise<T>): Promise<T> {
    const { claims } = signServiceRoleJwt(actor.id, { email: actor.email, appRole: actor.appRole })
    await this.db.query('BEGIN;')
    await this.db.query('SET LOCAL ROLE authenticated;')
    const claimsJson = JSON.stringify(claims).replace(/'/g, "''")
    await this.db.query(`SET LOCAL "request.jwt.claims" = '${claimsJson}'`)

    try {
      const result = await fn()
      await this.db.query('COMMIT;')
      return result
    } catch (error) {
      await this.db.query('ROLLBACK;')
      throw error
    } finally {
      await this.db.query('RESET ROLE;')
      await this.db.query('RESET "request.jwt.claims";')
    }
  }
}
