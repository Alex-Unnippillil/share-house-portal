import { redirect } from "next/navigation";
import { format, parseISO } from "date-fns";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { StripeActions } from "./_components/stripe-actions";
import { CatchUpPaymentCard } from "./_components/catch-up-payment-card";
import {
  calculateOutstanding,
  formatAutopayDay,
  getNextOutstandingCharge,
} from "@/lib/payments/catch-up";
import { formatCurrency } from "@/lib/payments/currency";
import type { CatchUpBalance } from "@/types/payments";
import { loadCatchUpBalances } from "./loaders";
import { createSupbaseServerClient } from "@/utils/supaone";
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client";
import { fetchMemberProfile } from "@/lib/data/members";
import { resolveMemberPersona } from "@/lib/members";

const managementHighlights = [
  {
    title: "Autopay scheduling",
    description:
      "Configure due dates, grace periods, and late fee rules so rent collection stays predictable for every unit.",
  },
  {
    title: "One-time catch up",
    description:
      "Support partial or one-off payments so residents can settle balances without waiting for the next billing cycle.",
  },
  {
    title: "Receipt history",
    description:
      "Export itemised receipts and payment histories for audits, reimbursements, or dispute resolution in seconds.",
  },
  {
    title: "Roomsily ledger",
    description:
      "Monitor each roommate's contributions alongside property manager adjustments to maintain full transparency.",
  },
];

const residentHighlights = [
  {
    title: "Know your autopay",
    description:
      "See when rent is scheduled, pause autopay if needed, and confirm the payment method on file.",
  },
  {
    title: "Catch up anytime",
    description:
      "Send a one-off payment to clear outstanding balances without waiting for the next automatic charge.",
  },
  {
    title: "Track every charge",
    description:
      "Review what still needs to be paid, including utilities, parking, or shared reimbursements.",
  },
  {
    title: "Get help fast",
    description:
      "Reach your property manager or landlord instantly when you have questions about rent or receipts.",
  },
];

function describeAutopayStatus(balance: CatchUpBalance) {
  const autopayDay = formatAutopayDay(balance.autopayDay);

  switch (balance.autopayStatus) {
    case "active":
      return `Autopay active · ${autopayDay} each month`;
    case "paused":
      return `Autopay paused · resumes ${autopayDay}`;
    case "disabled":
      return "Autopay off";
  }

  return "";
}

function formatFullDate(date: string) {
  return format(parseISO(date), "MMM d, yyyy");
}

type ResidentPaymentsOverviewProps = {
  balance: CatchUpBalance | null;
  defaultCurrency: string;
  displayName: string;
  managerContact?: CatchUpBalance["contacts"]["propertyManager"] | null;
};

function ResidentPaymentsOverview({
  balance,
  defaultCurrency,
  displayName,
  managerContact,
}: ResidentPaymentsOverviewProps) {
  const outstanding = balance ? calculateOutstanding(balance.charges) : 0;
  const nextCharge = balance ? getNextOutstandingCharge(balance.charges) : null;
  const autopayDescription = balance ? describeAutopayStatus(balance) : "Autopay not configured yet";

  return (
    <div className="container max-w-4xl space-y-10 py-12">
      <header className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Payments</h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Hi {displayName}, review your rent balance, autopay status, and property manager contact details in one place.
          </p>
        </div>
        <Separator />
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {residentHighlights.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      {balance ? (
        <>
          <section className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Autopay status</CardTitle>
                <CardDescription>Keep tabs on your recurring rent payment.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">{autopayDescription}</p>
                <div className="text-sm text-muted-foreground">
                  Monthly share · {formatCurrency(balance.monthlyShare, balance.currency)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Last payment · {formatFullDate(balance.lastPaymentDate)} · {formatCurrency(balance.lastPaymentAmount, balance.currency)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Outstanding balance</CardTitle>
                <CardDescription>Everything left to pay before you&apos;re fully caught up.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-semibold">
                  {formatCurrency(outstanding, balance.currency)}
                </div>
                {nextCharge ? (
                  <p className="text-sm text-muted-foreground">
                    Next charge · {nextCharge.description} due {format(parseISO(nextCharge.dueDate), "MMM d")}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">No upcoming charges — great job staying current!</p>
                )}
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Charge breakdown</CardTitle>
              <CardDescription>Line items still waiting on payment.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {balance.charges.length ? (
                <ul className="space-y-3">
                  {balance.charges.map((charge) => (
                    <li
                      key={charge.id}
                      className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-muted/30 p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{charge.description}</p>
                        <p className="text-xs text-muted-foreground">
                          Due {formatFullDate(charge.dueDate)} · {charge.category}
                        </p>
                      </div>
                      <p className="text-sm font-semibold">
                        {formatCurrency(charge.outstandingAmount, balance.currency)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">There are no open charges right now.</p>
              )}
            </CardContent>
          </Card>

          {managerContact ? (
            <Card>
              <CardHeader>
                <CardTitle>Need help?</CardTitle>
                <CardDescription>Contact your property manager or landlord for assistance.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm font-medium">{managerContact.name}</p>
                  <p className="text-sm text-muted-foreground">{managerContact.email}</p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <a href={`mailto:${managerContact.email}`}>Email {managerContact.name.split(' ')[0] || 'manager'}</a>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <CatchUpPaymentCard balances={[balance]} />
            <Card>
              <CardHeader>
                <CardTitle>Manage payments with Stripe</CardTitle>
                <CardDescription>
                  Create a quick checkout session, open the billing portal, or share payment metadata with your manager.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <StripeActions />
              </CardContent>
            </Card>
          </section>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No balances yet</CardTitle>
            <CardDescription>
              We couldn&apos;t find any rent balances connected to your profile. Reach out to your property manager if you expected charges here.
            </CardDescription>
          </CardHeader>
          {managerContact ? (
            <CardContent>
              <Button asChild variant="outline" size="sm">
                <a href={`mailto:${managerContact.email}`}>Email {managerContact.name}</a>
              </Button>
            </CardContent>
          ) : null}
        </Card>
      )}
    </div>
  );
}

type ManagementPaymentsOverviewProps = {
  catchUpBalances: CatchUpBalance[];
  defaultCurrency: string;
};

function ManagementPaymentsOverview({
  catchUpBalances,
  defaultCurrency,
}: ManagementPaymentsOverviewProps) {
  const outstandingSummaries = catchUpBalances.map((balance) => {
    const outstanding = calculateOutstanding(balance.charges);
    const nextCharge = getNextOutstandingCharge(balance.charges);
    return { balance, outstanding, nextCharge };
  });

  const totalOutstanding = outstandingSummaries.reduce((sum, item) => sum + item.outstanding, 0);

  const activeAutopays = catchUpBalances.filter((balance) => balance.autopayStatus === "active").length;
  const pausedAutopays = catchUpBalances.filter((balance) => balance.autopayStatus === "paused").length;
  const disabledAutopays = catchUpBalances.filter((balance) => balance.autopayStatus === "disabled").length;

  const autopCoveragePercentage =
    catchUpBalances.length > 0 ? Math.round((activeAutopays / catchUpBalances.length) * 100) : 0;

  const roommateSummaries = [...outstandingSummaries].sort((a, b) => b.outstanding - a.outstanding);

  return (
    <div className="container max-w-5xl space-y-10 py-12">
      <header className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Payments</h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Monitor rent, deposits, and reimbursements across every resident while keeping autopay and reconciliation under your control.
          </p>
        </div>
        <Separator />
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {managementHighlights.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Catch-up snapshot</CardTitle>
              <CardDescription>
                Monitor outstanding balances and autopay coverage across the unit.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1 rounded-lg border bg-muted/40 p-4">
                  <dt className="text-xs uppercase text-muted-foreground">Outstanding total</dt>
                  <dd className="text-lg font-semibold">
                    {formatCurrency(totalOutstanding, defaultCurrency)}
                  </dd>
                  <p className="text-xs text-muted-foreground">
                    {catchUpBalances.length} roommates tracked
                  </p>
                </div>
                <div className="space-y-1 rounded-lg border bg-muted/40 p-4">
                  <dt className="text-xs uppercase text-muted-foreground">Autopay coverage</dt>
                  <dd className="text-lg font-semibold">
                    {activeAutopays}/{catchUpBalances.length}
                  </dd>
                  <p className="text-xs text-muted-foreground">
                    {autopCoveragePercentage}% of roommates on autopay
                  </p>
                </div>
                <div className="space-y-1 rounded-lg border bg-muted/40 p-4">
                  <dt className="text-xs uppercase text-muted-foreground">Catch-up required</dt>
                  <dd className="text-lg font-semibold">
                    {pausedAutopays + disabledAutopays}
                  </dd>
                  <p className="text-xs text-muted-foreground">
                    {pausedAutopays} paused · {disabledAutopays} off
                  </p>
                </div>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Roommate balances</CardTitle>
              <CardDescription>
                Review who still owes what before creating a catch-up payment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {roommateSummaries.map(({ balance, outstanding, nextCharge }) => (
                <div
                  key={balance.roommateId}
                  className="flex flex-wrap items-start justify-between gap-4 rounded-lg border bg-muted/30 p-4"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{balance.roommateName}</p>
                    <p className="text-xs text-muted-foreground">
                      {balance.unitLabel} · {describeAutopayStatus(balance)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Last payment {formatFullDate(balance.lastPaymentDate)} · {formatCurrency(
                        balance.lastPaymentAmount,
                        balance.currency,
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {formatCurrency(outstanding, balance.currency)}
                    </p>
                    {nextCharge ? (
                      <p className="text-xs text-muted-foreground">
                        Next: {nextCharge.description} due {format(parseISO(nextCharge.dueDate), "MMM d")}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">No upcoming charges</p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Pay with Stripe</CardTitle>
              <CardDescription>Create a quick checkout or open the Billing Portal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <StripeActions />
            </CardContent>
          </Card>
        </div>
        <CatchUpPaymentCard balances={catchUpBalances} />
      </section>
    </div>
  );
}

export default async function PaymentsPage() {
  const supabase = await createSupbaseServerClient();
  const typedSupabase = supabase as unknown as TypedSupabaseClient;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const profile = await fetchMemberProfile(typedSupabase, user.id);
  const persona = resolveMemberPersona(profile?.role ?? null);

  const catchUpBalances = await loadCatchUpBalances();
  const defaultCurrency = catchUpBalances[0]?.currency ?? "USD";

  if (persona === "management") {
    return (
      <ManagementPaymentsOverview
        catchUpBalances={catchUpBalances}
        defaultCurrency={defaultCurrency}
      />
    );
  }

  const normalizedEmail = profile?.email?.toLowerCase();
  const residentBalance = normalizedEmail
    ? catchUpBalances.find(
        (balance) => balance.contacts.primary.email.toLowerCase() === normalizedEmail,
      )
    : undefined;

  const managerContact = residentBalance?.contacts.propertyManager
    ?? catchUpBalances.find((balance) => balance.contacts.propertyManager)?.contacts
      .propertyManager
    ?? null;

  const displayName = profile?.full_name || profile?.email || "Resident";

  return (
    <ResidentPaymentsOverview
      balance={residentBalance ?? null}
      defaultCurrency={defaultCurrency}
      displayName={displayName}
      managerContact={managerContact}
    />
  );
}
