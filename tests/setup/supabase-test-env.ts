import { GenericContainer, Network, StartedNetwork, StartedTestContainer, Wait } from "testcontainers"
import { Pool } from "pg"
import { PostgrestClient } from "@supabase/postgrest-js"

interface SupabaseTestContext {
  network: StartedNetwork
  containers: {
    postgres: StartedTestContainer
    postgrest: StartedTestContainer
  }
  pool: Pool
  client: PostgrestClient<any>
}

declare global {
  // eslint-disable-next-line no-var
  var __supabaseTestContext: SupabaseTestContext | undefined
}

const POSTGRES_IMAGE = process.env.TEST_SUPABASE_POSTGRES_IMAGE ?? "postgres:15-alpine"
const POSTGREST_IMAGE = process.env.TEST_SUPABASE_POSTGREST_IMAGE ?? "postgrest/postgrest:v12.0.3"
const POSTGRES_USER = "postgres"
const POSTGRES_PASSWORD = "postgres"
const POSTGRES_DB = "postgres"

function ensureContext(): SupabaseTestContext {
  if (!globalThis.__supabaseTestContext) {
    throw new Error("Supabase test environment has not been initialised")
  }

  return globalThis.__supabaseTestContext
}

async function initializeSchema(pool: Pool) {
  await pool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";')
  await pool.query('CREATE SCHEMA IF NOT EXISTS auth;')

  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth.users (
      id UUID PRIMARY KEY,
      email TEXT,
      raw_app_meta_data JSONB DEFAULT '{}'::jsonb,
      raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.profiles (
      id UUID PRIMARY KEY,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      email TEXT,
      full_name TEXT,
      username TEXT,
      website TEXT,
      avatar_url TEXT,
      role TEXT,
      unit_id UUID,
      phone TEXT,
      language TEXT,
      stripe_customer_id TEXT,
      rent_share INTEGER,
      metadata JSONB DEFAULT '{}'::jsonb
    );
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      title TEXT NOT NULL,
      description TEXT,
      document_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      file_url TEXT,
      documenso_envelope_id TEXT,
      documenso_template_id TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      tenant_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      unit_id UUID,
      requires_signature BOOLEAN DEFAULT FALSE,
      expires_at TIMESTAMPTZ,
      signed_at TIMESTAMPTZ,
      version INTEGER DEFAULT 1,
      parent_document_id UUID REFERENCES public.documents(id)
    );
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.document_signatures (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
      signer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      signer_email TEXT NOT NULL,
      signer_name TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      signed_at TIMESTAMPTZ,
      declined_at TIMESTAMPTZ,
      decline_reason TEXT,
      documenso_signature_id TEXT,
      ip_address TEXT,
      user_agent TEXT,
      signature_data JSONB,
      signing_order INTEGER DEFAULT 1
    );
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.document_access_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      signer_id UUID REFERENCES public.profiles(id),
      action TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      metadata JSONB DEFAULT '{}'::jsonb
    );
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.leases (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      start_date DATE NOT NULL,
      end_date DATE,
      rent_amount INTEGER,
      rent_frequency TEXT NOT NULL DEFAULT 'monthly',
      security_deposit INTEGER,
      tenant_ids UUID[] NOT NULL,
      property_address TEXT,
      unit_number TEXT,
      landlord_name TEXT,
      landlord_email TEXT,
      auto_renew BOOLEAN DEFAULT FALSE,
      renewal_notice_days INTEGER DEFAULT 30,
      special_terms TEXT,
      status TEXT NOT NULL DEFAULT 'active'
    );
  `)
}

export async function startSupabaseTestEnvironment(): Promise<SupabaseTestContext> {
  if (globalThis.__supabaseTestContext) {
    return globalThis.__supabaseTestContext
  }

  const network = await new Network().start()

  const postgres = await new GenericContainer(POSTGRES_IMAGE)
    .withEnvironment({
      POSTGRES_PASSWORD,
      POSTGRES_USER,
      POSTGRES_DB,
    })
    .withNetwork(network)
    .withNetworkAliases("supabase-db")
    .withExposedPorts(5432)
    .withWaitStrategy(Wait.forLogMessage("database system is ready to accept connections"))
    .start()

  const pool = new Pool({
    host: postgres.getHost(),
    port: postgres.getMappedPort(5432),
    user: POSTGRES_USER,
    password: POSTGRES_PASSWORD,
    database: POSTGRES_DB,
  })

  await initializeSchema(pool)

  const postgrest = await new GenericContainer(POSTGREST_IMAGE)
    .withEnvironment({
      PGRST_DB_URI: `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@supabase-db:5432/${POSTGRES_DB}`,
      PGRST_DB_SCHEMA: "public",
      PGRST_DB_ANON_ROLE: POSTGRES_USER,
      PGRST_SERVER_PORT: "3000",
      PGRST_DB_PREPARED_STATEMENTS: "false",
    })
    .withNetwork(network)
    .withExposedPorts(3000)
    .withWaitStrategy(Wait.forHttp("/").forStatusCode(200))
    .start()

  const restUrl = `http://${postgrest.getHost()}:${postgrest.getMappedPort(3000)}`
  const client = new PostgrestClient(restUrl, {
    headers: {
      Accept: "application/json",
    },
    schema: "public",
  })

  const context: SupabaseTestContext = {
    network,
    containers: { postgres, postgrest },
    pool,
    client,
  }

  globalThis.__supabaseTestContext = context

  return context
}

export async function stopSupabaseTestEnvironment() {
  const context = globalThis.__supabaseTestContext
  if (!context) {
    return
  }

  globalThis.__supabaseTestContext = undefined

  await context.pool.end()
  await context.containers.postgrest.stop()
  await context.containers.postgres.stop()
  await context.network.stop()
}

export function getSupabaseClient() {
  return ensureContext().client
}

export function getDatabasePool() {
  return ensureContext().pool
}

export async function resetDatabase() {
  const { pool } = ensureContext()

  await pool.query(
    `TRUNCATE TABLE
      public.document_access_logs,
      public.document_signatures,
      public.leases,
      public.documents,
      public.profiles
    RESTART IDENTITY CASCADE;`
  )

  await pool.query("TRUNCATE TABLE auth.users RESTART IDENTITY CASCADE;")
}
