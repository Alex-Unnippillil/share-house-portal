'use client';

import { type FormEvent, useMemo, useState } from 'react';
import { track } from '@vercel/analytics/react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, ClipboardList, Search, Sparkles, Wrench } from 'lucide-react';

type PriorityLevel = 'low' | 'normal' | 'high' | 'urgent';
type MaintenanceStatus = 'open' | 'scheduled' | 'completed';
type RecencyOption = 'week' | 'month' | 'quarter';

type MaintenanceSearchFilters = {
  category: string | null;
  priority: PriorityLevel | null;
  status: MaintenanceStatus | null;
};

type MaintenanceRequestSummary = {
  id: string;
  title: string;
  summary: string;
  category: string;
  priority: PriorityLevel;
  status: MaintenanceStatus;
  updated: string;
  recency: RecencyOption;
};

type HelperDefinition = {
  id: string;
  label: string;
  description?: string;
  nextFilters: (current: MaintenanceSearchFilters) => MaintenanceSearchFilters;
};

const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

const STATUS_LABELS: Record<MaintenanceStatus, string> = {
  open: 'Open',
  scheduled: 'Scheduled',
  completed: 'Completed',
};

const REQUEST_SUMMARIES: MaintenanceRequestSummary[] = [
  {
    id: 'dishwasher',
    title: 'Dishwasher not draining',
    summary: 'Water pooling after each cycle — property manager needs a plumber dispatch.',
    category: 'Appliance',
    priority: 'high',
    status: 'open',
    updated: '2 hours ago',
    recency: 'week',
  },
  {
    id: 'hvac',
    title: 'HVAC airflow imbalance',
    summary: 'Temperature swing between bedrooms — filter replaced but issue persists.',
    category: 'HVAC',
    priority: 'normal',
    status: 'scheduled',
    updated: 'Yesterday',
    recency: 'month',
  },
  {
    id: 'leak',
    title: 'Bathroom sink slow leak',
    summary: 'Cabinet base damp, towels placed underneath as temporary fix.',
    category: 'Plumbing',
    priority: 'urgent',
    status: 'open',
    updated: 'Today',
    recency: 'week',
  },
];

const INITIAL_FILTERS: MaintenanceSearchFilters = {
  category: 'Landscaping',
  priority: 'urgent',
  status: 'completed',
};

const INITIAL_FILTER_KEY = JSON.stringify(INITIAL_FILTERS);

function normalizeFilters(filters: MaintenanceSearchFilters) {
  return JSON.stringify(filters);
}

function filterRequests(results: MaintenanceRequestSummary[], filters: MaintenanceSearchFilters) {
  return results.filter((request) => {
    const matchesCategory = filters.category ? request.category === filters.category : true;
    const matchesPriority = filters.priority ? request.priority === filters.priority : true;
    const matchesStatus = filters.status ? request.status === filters.status : true;
    return matchesCategory && matchesPriority && matchesStatus;
  });
}

export function MaintenanceSearchExperience() {
  const [filters, setFilters] = useState<MaintenanceSearchFilters>(INITIAL_FILTERS);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filterKey = useMemo(() => normalizeFilters(filters), [filters]);
  const results = useMemo(() => filterRequests(REQUEST_SUMMARIES, filters), [filters]);

  const helperCards = useMemo<HelperDefinition[]>(() => {
    const base: HelperDefinition[] = [
      {
        id: 'urgent_focus',
        label: 'Show urgent tickets',
        description: 'Highlight high-priority issues filed this week.',
        nextFilters: () => ({ category: null, priority: 'urgent', status: 'open' }),
      },
      {
        id: 'appliance_focus',
        label: 'Appliance issues',
        description: 'Filter to appliances needing attention this month.',
        nextFilters: () => ({ category: 'Appliance', priority: null, status: 'open' }),
      },
      {
        id: 'completed_followup',
        label: 'Review completed fixes',
        description: 'Audit recently closed work orders for accuracy.',
        nextFilters: () => ({ category: null, priority: null, status: 'completed' }),
      },
    ];

    if (filterKey !== INITIAL_FILTER_KEY) {
      base.unshift({
        id: 'reset_filters',
        label: 'Reset to maintenance defaults',
        description: 'Clear helpers to review everything assigned to the household.',
        nextFilters: () => ({ ...INITIAL_FILTERS }),
      });
    }

    return base;
  }, [filterKey]);

  const sampleChips = useMemo<HelperDefinition[]>(() => ([
    {
      id: 'chip_plumbing',
      label: 'Plumbing leaks',
      nextFilters: () => ({ category: 'Plumbing', priority: 'high', status: 'open' }),
    },
    {
      id: 'chip_hvac',
      label: 'HVAC comfort',
      nextFilters: () => ({ category: 'HVAC', priority: null, status: 'open' }),
    },
    {
      id: 'chip_pest',
      label: 'Pest prevention',
      nextFilters: () => ({ category: 'Pest Control', priority: null, status: 'open' }),
    },
  ]), []);

  const applyHelper = (helper: HelperDefinition, surface: 'card' | 'chip') => {
    const nextFilters = helper.nextFilters(filters);
    setFilters(nextFilters);

    track('maintenance_search_helper_selected', {
      helper_id: helper.id,
      surface,
      previous_filter: filterKey,
      next_filter: normalizeFilters(nextFilters),
    });
  };

  const handleDialogChange = (value: boolean) => {
    setDialogOpen(value);
    if (value) {
      track('maintenance_search_helper_selected', {
        helper_id: 'log_request',
        surface: 'create_action',
        previous_filter: filterKey,
      });
    }
  };

  const handleRequestSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDialogOpen(false);
  };

  return (
    <Card className="border-border/70">
      <CardHeader className="space-y-2">
        <CardTitle>Search maintenance history</CardTitle>
        <CardDescription>Filter open, scheduled, or completed work orders with fast helper presets.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline">Category: {filters.category ?? 'All'}</Badge>
          <Badge variant="outline">Priority: {filters.priority ? PRIORITY_LABELS[filters.priority] : 'All'}</Badge>
          <Badge variant="outline">Status: {filters.status ? STATUS_LABELS[filters.status] : 'All'}</Badge>
        </div>

        {results.length > 0 ? (
          <div className="space-y-3">
            {results.map((request) => (
              <div
                key={request.id}
                className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/30 p-4 transition hover:border-primary/40 hover:bg-background"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Wrench className="size-4 text-primary" aria-hidden />
                      <span className="text-sm font-semibold text-foreground">{request.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{request.summary}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                    <Badge variant="secondary">{request.category}</Badge>
                    <span>{PRIORITY_LABELS[request.priority]} priority</span>
                    <span>{request.updated}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <AlertTriangle className="size-3 text-primary" aria-hidden />
                  <span>{STATUS_LABELS[request.status]} • logged by maintenance bot</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-10 text-center">
            <div className="flex size-14 items-center justify-center rounded-full border border-dashed border-primary/30 bg-background text-primary">
              <Sparkles className="size-6" aria-hidden />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">No requests match these filters</h3>
              <p className="text-sm text-muted-foreground">
                Try a preset below or log a new request so property care can triage it quickly.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              {sampleChips.map((chip) => (
                <Button
                  key={chip.id}
                  size="sm"
                  variant="secondary"
                  className="flex items-center gap-1"
                  onClick={() => applyHelper(chip, 'chip')}
                >
                  <Search className="size-3" aria-hidden />
                  {chip.label}
                </Button>
              ))}
            </div>

            <div className="grid w-full gap-3 md:grid-cols-3">
              {helperCards.map((helper) => (
                <button
                  key={helper.id}
                  type="button"
                  onClick={() => applyHelper(helper, 'card')}
                  className="flex h-full flex-col gap-2 rounded-lg border border-border/60 bg-background p-4 text-left transition hover:border-primary/40 hover:bg-background/80"
                >
                  <div className="text-sm font-semibold text-foreground">{helper.label}</div>
                  {helper.description ? (
                    <p className="text-xs text-muted-foreground">{helper.description}</p>
                  ) : null}
                </button>
              ))}
            </div>

            <div className="flex flex-col items-center gap-2">
              <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
                <DialogTrigger asChild>
                  <Button size="sm" className="flex items-center gap-2">
                    <ClipboardList className="size-4" aria-hidden />
                    Log a maintenance issue
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Log a maintenance issue</DialogTitle>
                    <DialogDescription>
                      Capture the basics so your property manager can route the fix instantly.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleRequestSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="issue-title">Issue title</Label>
                      <Input id="issue-title" placeholder="e.g., Dryer making loud noise" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="issue-details">Details</Label>
                      <Textarea
                        id="issue-details"
                        placeholder="Share what you’ve tried so far, plus any photos or access windows."
                        rows={4}
                        required
                      />
                    </div>
                    <DialogFooter className="gap-2 sm:justify-end">
                      <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Submit request</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              <p className="text-xs text-muted-foreground">
                New requests notify the property team and populate the shared maintenance board.
              </p>
            </div>
          </div>
        )}

        <Separator />

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>Tip: urgent filters remove completed jobs so only active blockers remain.</span>
        </div>
      </CardContent>
    </Card>
  );
}
