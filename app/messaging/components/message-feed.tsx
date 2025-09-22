'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { AlertCircle, Bell, CheckCircle2, Info, MessagesSquare } from 'lucide-react';

import { PaginationControls } from '@/components/pagination-controls';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { MessageRecord } from '@/types/messages';
import type { PaginationMetadata } from '@/types/pagination';

import { getMessagesAction } from '../actions';

const PAGE_SIZE = 10;

type MessageTypeFilter = 'all' | 'info' | 'success' | 'warning' | 'error';

type CursorMap = Record<number, string | null>;

const typeLabels: Record<MessageTypeFilter, string> = {
  all: 'All types',
  info: 'Info',
  success: 'Success',
  warning: 'Warning',
  error: 'Error',
};

const typeIconMap = {
  info: Info,
  success: CheckCircle2,
  warning: AlertCircle,
  error: Bell,
} satisfies Record<'info' | 'success' | 'warning' | 'error', typeof Info>;

export function MessageFeed() {
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [cursorMap, setCursorMap] = useState<CursorMap>({ 1: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<MessageTypeFilter>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const messageFilters = useMemo(() => {
    return {
      type: typeFilter === 'all' ? undefined : [typeFilter],
      read: showUnreadOnly ? false : undefined,
    };
  }, [typeFilter, showUnreadOnly]);

  const filterKey = useMemo(() => JSON.stringify(messageFilters), [messageFilters]);
  const cursorForPage = cursorMap[currentPage] ?? null;

  useEffect(() => {
    setCurrentPage(1);
    setCursorMap({ 1: null });
  }, [filterKey]);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await getMessagesAction({
          filters: messageFilters,
          pagination: {
            limit: PAGE_SIZE,
            page: currentPage,
            cursor: cursorForPage ?? undefined,
          },
        });

        if (result.success && result.data) {
          setMessages(result.data.items);
          setPagination(result.data.pagination);
          setCursorMap(prev => {
            const next = { ...prev };

            if (result.data.pagination.nextCursor) {
              next[currentPage + 1] = result.data.pagination.nextCursor;
            } else {
              delete next[currentPage + 1];
            }

            if (currentPage > 1) {
              next[currentPage - 1] = result.data.pagination.prevCursor ?? null;
            }

            next[currentPage] = cursorForPage ?? null;
            return next;
          });
        } else {
          setError(result.error || 'Failed to fetch messages');
          setMessages([]);
          setPagination(null);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
        setError('An unexpected error occurred while loading messages.');
        setMessages([]);
        setPagination(null);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [currentPage, cursorForPage, filterKey, messageFilters]);

  const handlePageChange = (page: number) => {
    if (!pagination) return;
    if (page < 1) return;
    if (pagination.pageCount > 0 && page > pagination.pageCount) return;
    if (page !== currentPage) {
      setCurrentPage(page);
    }
  };

  const renderMessageCard = (message: MessageRecord) => {
    const Icon = typeIconMap[message.type];
    const timestamp = formatDistanceToNow(new Date(message.created_at), {
      addSuffix: true,
    });

    return (
      <Card key={message.id} className="border-muted-foreground/20 transition-shadow hover:shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-muted">
              <Icon className="size-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold leading-tight">
                {message.title}
              </CardTitle>
              <div className="text-xs text-muted-foreground">{timestamp}</div>
            </div>
          </div>
          <Badge variant={message.read ? 'outline' : 'default'} className="text-xs">
            {message.read ? 'Read' : 'Unread'}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>{message.body}</p>
          {message.action_url && (
            <a
              href={message.action_url}
              className="inline-flex items-center text-xs font-medium text-primary hover:underline"
            >
              View details
            </a>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Select value={typeFilter} onValueChange={value => setTypeFilter(value as MessageTypeFilter)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Filter type" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(typeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch
              id="unread-only"
              checked={showUnreadOnly}
              onCheckedChange={setShowUnreadOnly}
            />
            <label htmlFor="unread-only">Unread only</label>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MessagesSquare className="size-4" />
          <span>
            {pagination ? `${pagination.total.toLocaleString()} messages` : '—'}
          </span>
        </div>
      </div>

      {loading && messages.length === 0 ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardHeader>
                <div className="h-5 w-1/3 rounded bg-muted" />
                <div className="mt-2 h-4 w-24 rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-4 w-full rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="border-destructive/40 bg-destructive/5 p-6">
          <div className="space-y-3 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)}>
              Try again
            </Button>
          </div>
        </Card>
      ) : messages.length === 0 ? (
        <Card className="p-10 text-center">
          <h3 className="text-lg font-medium">No messages yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {showUnreadOnly
              ? 'You have no unread messages with the current filters.'
              : 'System notifications and roommate updates will appear here.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {messages.map(renderMessageCard)}
        </div>
      )}

      {pagination && messages.length > 0 && (
        <PaginationControls
          page={pagination.page}
          pageCount={pagination.pageCount}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={handlePageChange}
          isLoading={loading}
        />
      )}
    </section>
  );
}
