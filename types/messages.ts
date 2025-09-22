import type { PaginationMetadata, PaginationParams } from './pagination';

export type MessageCategory = 'info' | 'success' | 'warning' | 'error';

export interface MessageRecord {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: MessageCategory;
  action_url?: string | null;
  metadata?: Record<string, any>;
  read?: boolean | null;
  created_at: string;
  updated_at?: string | null;
}

export interface MessageListFilters {
  type?: MessageCategory[];
  read?: boolean;
  userId?: string;
  search?: string;
}

export interface MessageListParams {
  filters?: MessageListFilters;
  pagination?: PaginationParams;
}

export interface PaginatedMessagesResponse {
  items: MessageRecord[];
  pagination: PaginationMetadata;
  filters?: MessageListFilters;
}
