import Stripe from 'stripe';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/node';

type SupabaseSubscription = {
  id: string;
  user_id: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid';
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
  metadata: Record<string, unknown> | null;
};

type Metrics = {
  totalSupabase: number;
  totalStripe: number;
  missingStripeId: number;
  missingInStripe: number;
  missingInSupabase: number;
  statusMatches: number;
  statusMismatches: number;
  updatesApplied: number;
};

type DriftRecord = {
  subscriptionId: string;
  supabaseId: string | null;
  supabaseStatus: SupabaseSubscription['status'] | null;
  stripeStatus: SupabaseSubscription['status'] | null;
  action: 'none' | 'update' | 'investigate';
  notes?: string;
};

const PAGE_SIZE = 100;
const APPLY_FLAG = '--apply';

const stripeStatusToSupabase: Record<Stripe.Subscription.Status, SupabaseSubscription['status']> = {
  active: 'active',
  trialing: 'active',
  past_due: 'past_due',
  unpaid: 'unpaid',
  canceled: 'canceled',
  incomplete: 'past_due',
  incomplete_expired: 'canceled',
  paused: 'past_due',
};

function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

async function fetchSupabaseSubscriptions(client: SupabaseClient): Promise<SupabaseSubscription[]> {
  const results: SupabaseSubscription[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await client
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    results.push(...(data as SupabaseSubscription[]));

    if (data.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }
  return results;
}

async function fetchStripeSubscriptions(stripe: Stripe): Promise<Stripe.Subscription[]> {
  const subscriptions: Stripe.Subscription[] = [];
  let startingAfter: string | undefined;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const page = await stripe.subscriptions.list({
      limit: PAGE_SIZE,
      starting_after: startingAfter,
      expand: ['data.latest_invoice.payment_intent'],
    });

    subscriptions.push(...page.data);

    if (!page.has_more || page.data.length === 0) {
      break;
    }

    startingAfter = page.data[page.data.length - 1]?.id;
  }

  return subscriptions;
}

function mapStripeStatus(status: Stripe.Subscription.Status): SupabaseSubscription['status'] {
  return stripeStatusToSupabase[status] ?? 'active';
}

function toIso(timestamp: number | null | undefined): string | null {
  if (!timestamp) {
    return null;
  }
  return new Date(timestamp * 1000).toISOString();
}

async function sendSlackNotification(message: string, payload: Record<string, unknown>) {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) {
    return;
  }

  await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: message,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Stripe ↔ Supabase Subscription Drift*\n${message}`,
          },
        },
        {
          type: 'section',
          fields: Object.entries(payload).map(([key, value]) => ({
            type: 'mrkdwn',
            text: `*${key}*\n${value}`,
          })),
        },
      ],
    }),
  });
}

async function reportToSentry(message: string, metrics: Metrics, drift: DriftRecord[]) {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  const client = Sentry.getCurrentHub().getClient();
  if (!client) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0,
    });
  }

  Sentry.setContext('metrics', metrics as Record<string, unknown>);
  Sentry.setContext('drift', {
    mismatches: drift.filter((entry) => entry.action !== 'none'),
  });
  Sentry.captureMessage(message, {
    level: metrics.statusMismatches > 0 || metrics.missingInStripe > 0 || metrics.missingInSupabase > 0 ? 'warning' : 'info',
  });
  await Sentry.flush(2000);
}

async function main() {
  const applyChanges = process.argv.includes(APPLY_FLAG);

  const SUPABASE_URL = env('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = env('SUPABASE_SERVICE_ROLE_KEY');
  const STRIPE_SECRET_KEY = env('STRIPE_SECRET_KEY');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

  const [supabaseSubscriptions, stripeSubscriptions] = await Promise.all([
    fetchSupabaseSubscriptions(supabase),
    fetchStripeSubscriptions(stripe),
  ]);

  const supabaseByStripeId = new Map<string, SupabaseSubscription>();
  const supabaseWithoutStripeId: SupabaseSubscription[] = [];

  for (const subscription of supabaseSubscriptions) {
    if (!subscription.stripe_subscription_id) {
      supabaseWithoutStripeId.push(subscription);
      continue;
    }
    supabaseByStripeId.set(subscription.stripe_subscription_id, subscription);
  }

  const stripeById = new Map<string, Stripe.Subscription>();
  stripeSubscriptions.forEach((sub) => stripeById.set(sub.id, sub));

  const drift: DriftRecord[] = [];
  let statusMatches = 0;
  let statusMismatches = 0;
  let missingInStripe = 0;
  let missingInSupabase = 0;
  let updatesApplied = 0;

  for (const stripeSubscription of stripeSubscriptions) {
    const supabaseSubscription = supabaseByStripeId.get(stripeSubscription.id);
    const mappedStatus = mapStripeStatus(stripeSubscription.status);

    if (!supabaseSubscription) {
      missingInSupabase += 1;
      drift.push({
        subscriptionId: stripeSubscription.id,
        supabaseId: null,
        supabaseStatus: null,
        stripeStatus: mappedStatus,
        action: 'investigate',
        notes: 'Stripe subscription missing in Supabase',
      });
      continue;
    }

    if (supabaseSubscription.status === mappedStatus) {
      statusMatches += 1;
      continue;
    }

    statusMismatches += 1;

    const updatePayload = {
      status: mappedStatus,
      current_period_start: toIso(stripeSubscription.current_period_start),
      current_period_end: toIso(stripeSubscription.current_period_end),
      cancel_at_period_end: stripeSubscription.cancel_at_period_end ?? false,
    };

    if (applyChanges) {
      const { error } = await supabase
        .from('subscriptions')
        .update(updatePayload)
        .eq('id', supabaseSubscription.id);

      if (error) {
        drift.push({
          subscriptionId: stripeSubscription.id,
          supabaseId: supabaseSubscription.id,
          supabaseStatus: supabaseSubscription.status,
          stripeStatus: mappedStatus,
          action: 'investigate',
          notes: `Failed to update Supabase: ${error.message}`,
        });
        continue;
      }

      updatesApplied += 1;
      drift.push({
        subscriptionId: stripeSubscription.id,
        supabaseId: supabaseSubscription.id,
        supabaseStatus: supabaseSubscription.status,
        stripeStatus: mappedStatus,
        action: 'update',
      });
    } else {
      drift.push({
        subscriptionId: stripeSubscription.id,
        supabaseId: supabaseSubscription.id,
        supabaseStatus: supabaseSubscription.status,
        stripeStatus: mappedStatus,
        action: 'none',
        notes: 'Run with --apply to update Supabase',
      });
    }
  }

  for (const subscription of supabaseSubscriptions) {
    if (!subscription.stripe_subscription_id) {
      missingInStripe += 1;
      drift.push({
        subscriptionId: 'missing-stripe-id',
        supabaseId: subscription.id,
        supabaseStatus: subscription.status,
        stripeStatus: null,
        action: 'investigate',
        notes: 'Supabase subscription missing Stripe subscription ID',
      });
      continue;
    }

    if (!stripeById.has(subscription.stripe_subscription_id)) {
      missingInStripe += 1;
      drift.push({
        subscriptionId: subscription.stripe_subscription_id,
        supabaseId: subscription.id,
        supabaseStatus: subscription.status,
        stripeStatus: null,
        action: 'investigate',
        notes: 'Supabase subscription missing in Stripe',
      });
    }
  }

  const metrics: Metrics = {
    totalSupabase: supabaseSubscriptions.length,
    totalStripe: stripeSubscriptions.length,
    missingStripeId: supabaseWithoutStripeId.length,
    missingInStripe,
    missingInSupabase,
    statusMatches,
    statusMismatches,
    updatesApplied,
  };

  const summary = `Processed ${metrics.totalSupabase} Supabase subscriptions and ${metrics.totalStripe} Stripe subscriptions. ` +
    `${metrics.statusMismatches} mismatches, ${metrics.missingInStripe} Supabase entries missing in Stripe, ` +
    `${metrics.missingInSupabase} Stripe entries missing in Supabase.`;

  console.log(summary);
  console.table(metrics);

  if (drift.length > 0) {
    console.log('Drift details:');
    console.table(drift.map(({ notes, ...rest }) => ({ ...rest, notes: notes ?? '' })));
  }

  await sendSlackNotification(summary, metrics);
  await reportToSentry(summary, metrics, drift);

  if (!applyChanges && metrics.statusMismatches > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Failed to sync subscriptions', error);
  void reportToSentry('Stripe ↔ Supabase subscription sync failed', {
    totalSupabase: 0,
    totalStripe: 0,
    missingStripeId: 0,
    missingInStripe: 0,
    missingInSupabase: 0,
    statusMatches: 0,
    statusMismatches: 0,
    updatesApplied: 0,
  }, []);
  process.exitCode = 1;
});
