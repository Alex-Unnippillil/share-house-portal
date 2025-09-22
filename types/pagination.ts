export interface PaginationMetadata {
  total: number;
  page: number;
  limit: number;
  pageCount: number;
  nextCursor: string | null;
  prevCursor: string | null;
}

export interface PaginationParams {
  limit?: number;
  page?: number;
  cursor?: string | null;
}
