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
import { MessageCircle, Search, Sparkles, Users } from 'lucide-react';

type TimeframeOption = 'week' | 'month' | 'quarter';

type MessagingSearchFilters = {
  query: string;
  tags: string[];
  timeframe: TimeframeOption;
};

type MessagingSearchResult = {
  id: string;
  title: string;
  preview: string;
  category: string;
  participants: number;
  updated: string;
  recency: TimeframeOption;
};

type HelperDefinition = {
  id: string;
  label: string;
  description?: string;
  nextFilters: (current: MessagingSearchFilters) => MessagingSearchFilters;
};

const TIMEFRAME_LABELS: Record<TimeframeOption, string> = {
  week: 'Past week',
  month: 'Past month',
  quarter: 'Past quarter',
};

const THREAD_RESULTS: MessagingSearchResult[] = [
  {
    id: 'chores',
    title: 'Q2 chore rotation plan',
    preview: 'Polls, checklists, and rotation updates for the upcoming deep clean weekend.',
    category: 'Chores',
    participants: 5,
    updated: '8 minutes ago',
    recency: 'week',
  },
  {
    id: 'wifi',
    title: 'Wi-Fi upgrade appointment',
    preview: 'Installer availability and coordination to host the tech this week.',
    category: 'Maintenance',
    participants: 4,
    updated: '1 hour ago',
    recency: 'week',
  },
  {
    id: 'grocery',
    title: 'June grocery co-op',
    preview: 'Bulk order planning, contributions, and delivery checklists.',
    category: 'Logistics',
    participants: 6,
    updated: 'Yesterday',
    recency: 'month',
  },
];

const INITIAL_FILTERS: MessagingSearchFilters = {
  query: 'quiet hours',
  tags: ['Announcements'],
  timeframe: 'week',
};

const INITIAL_FILTER_KEY = JSON.stringify({
  ...INITIAL_FILTERS,
  tags: [...INITIAL_FILTERS.tags].sort(),
});

function filterThreads(results: MessagingSearchResult[], filters: MessagingSearchFilters) {
  const normalizedQuery = filters.query.trim().toLowerCase();
  const tagSet = new Set(filters.tags);
  const timeframeRank: Record<TimeframeOption, number> = {
    week: 0,
    month: 1,
    quarter: 2,
  };

  return results.filter((result) => {
    const matchesQuery = normalizedQuery
      ? result.title.toLowerCase().includes(normalizedQuery) ||
        result.preview.toLowerCase().includes(normalizedQuery)
      : true;
    const matchesTag = tagSet.size > 0 ? tagSet.has(result.category) : true;
    const matchesTimeframe = timeframeRank[result.recency] <= timeframeRank[filters.timeframe];

    return matchesQuery && matchesTag && matchesTimeframe;
  });
}

function normalizeFilters(filters: MessagingSearchFilters) {
  return {
    ...filters,
    tags: [...filters.tags].sort(),
  } satisfies MessagingSearchFilters;
}

export function MessagingSearchExperience() {
  const [filters, setFilters] = useState<MessagingSearchFilters>(INITIAL_FILTERS);
  const [composerOpen, setComposerOpen] = useState(false);

  const filterKey = useMemo(() => JSON.stringify(normalizeFilters(filters)), [filters]);

  const results = useMemo(() => filterThreads(THREAD_RESULTS, filters), [filters]);

  const helperCards = useMemo<HelperDefinition[]>(() => {
    const baseHelpers: HelperDefinition[] = [
      {
        id: 'chores_focus',
        label: 'Coordinate chores & cleaning',
        description: 'Surface rotation polls and deep clean prep from this month.',
        nextFilters: () => ({ query: '', tags: ['Chores'], timeframe: 'month' }),
      },
      {
        id: 'maintenance_updates',
        label: 'Check maintenance chatter',
        description: 'Filter to maintenance threads that updated this week.',
        nextFilters: () => ({ query: '', tags: ['Maintenance'], timeframe: 'week' }),
      },
      {
        id: 'logistics_alignment',
        label: 'Review planning decisions',
        description: 'See logistics threads and polls resolved this quarter.',
        nextFilters: () => ({ query: '', tags: ['Logistics'], timeframe: 'quarter' }),
      },
    ];

    if (filterKey !== INITIAL_FILTER_KEY) {
      baseHelpers.unshift({
        id: 'reset_filters',
        label: 'Reset to inbox defaults',
        description: 'Clear helpers to search the full roommate history again.',
        nextFilters: () => ({ ...INITIAL_FILTERS }),
      });
    }

    return baseHelpers;
  }, [filterKey]);

  const sampleChips = useMemo<HelperDefinition[]>(() => ([
    {
      id: 'chip_wifi',
      label: 'Wi-Fi upgrade',
      nextFilters: () => ({ query: 'Wi-Fi', tags: ['Maintenance'], timeframe: 'week' }),
    },
    {
      id: 'chip_grocery',
      label: 'Grocery co-op',
      nextFilters: () => ({ query: 'grocery', tags: ['Logistics'], timeframe: 'month' }),
    },
    {
      id: 'chip_deep_clean',
      label: 'Deep clean weekend',
      nextFilters: () => ({ query: 'deep clean', tags: ['Chores'], timeframe: 'month' }),
    },
  ]), []);

  const applyHelper = (helper: HelperDefinition, surface: 'card' | 'chip') => {
    const nextFilters = helper.nextFilters(filters);
    setFilters(nextFilters);

    track('messaging_search_helper_selected', {
      helper_id: helper.id,
      surface,
      previous_filter: filterKey,
      next_filter: JSON.stringify(normalizeFilters(nextFilters)),
    });
  };

  const handleComposerOpenChange = (value: boolean) => {
    setComposerOpen(value);
    if (value) {
      track('messaging_search_helper_selected', {
        helper_id: 'create_thread',
        surface: 'create_action',
        previous_filter: filterKey,
      });
    }
  };

  const handleComposerSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setComposerOpen(false);
  };

  return (
    <Card className="border-border/70">
      <CardHeader className="space-y-2">
        <CardTitle>Search conversations</CardTitle>
        <CardDescription>Slice across roommate threads by topic, decision status, and recency.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline">Query: {filters.query || 'Any keyword'}</Badge>
          <Badge variant="outline">Topics: {filters.tags.length ? filters.tags.join(', ') : 'All threads'}</Badge>
          <Badge variant="outline">Timeframe: {TIMEFRAME_LABELS[filters.timeframe]}</Badge>
        </div>

        {results.length > 0 ? (
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{results.length} thread{results.length === 1 ? '' : 's'} found</p>
            <div className="space-y-3">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/30 p-4 transition hover:border-primary/40 hover:bg-background"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="size-4 text-primary" aria-hidden />
                        <span className="text-sm font-semibold text-foreground">{result.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{result.preview}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                      <Badge variant="secondary">{result.category}</Badge>
                      <span>{result.updated}</span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3" aria-hidden />
                        {result.participants} roommates
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-10 text-center">
            <div className="flex size-14 items-center justify-center rounded-full border border-dashed border-primary/30 bg-background text-primary">
              <Sparkles className="size-6" aria-hidden />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">No threads found</h3>
              <p className="text-sm text-muted-foreground">
                Try a curated filter below or spin up a new discussion to get everyone aligned.
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
              <Dialog open={composerOpen} onOpenChange={handleComposerOpenChange}>
                <DialogTrigger asChild>
                  <Button size="sm">Start a new thread</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Start a new thread</DialogTitle>
                    <DialogDescription>
                      Draft a quick update or decision so roommates can weigh in instantly.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleComposerSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="thread-subject">Subject</Label>
                      <Input id="thread-subject" placeholder="e.g., Reassign trash duty this week" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="thread-message">Message</Label>
                      <Textarea
                        id="thread-message"
                        placeholder="Share context, next steps, or polls residents should weigh in on."
                        rows={4}
                        required
                      />
                    </div>
                    <DialogFooter className="gap-2 sm:justify-end">
                      <Button type="button" variant="ghost" onClick={() => setComposerOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Send thread</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              <p className="text-xs text-muted-foreground">
                Launching a fresh topic instantly notifies subscribed roommates.
              </p>
            </div>
          </div>
        )}

        <Separator />

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>Tip: combine helpers to jump between chores, logistics, or maintenance planning quickly.</span>
        </div>
      </CardContent>
    </Card>
  );
}
