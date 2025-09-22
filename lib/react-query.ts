import { QueryClient, type QueryClientConfig, dehydrate, type DehydratedState } from "@tanstack/react-query"

export const QUERY_STALE_TIME = 2 * 60 * 1000 // 2 minutes
export const QUERY_DEDUPING_INTERVAL = 30 * 1000 // 30 seconds
export const QUERY_GC_TIME = 30 * 60 * 1000 // 30 minutes

const queryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: QUERY_STALE_TIME,
      gcTime: QUERY_GC_TIME,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      meta: {
        dedupingInterval: QUERY_DEDUPING_INTERVAL,
      },
    },
  },
}

export function createQueryClient() {
  return new QueryClient(queryClientConfig)
}

export function createServerQueryClient() {
  return createQueryClient()
}

export function dehydrateQueryClient(queryClient: QueryClient): DehydratedState {
  return dehydrate(queryClient)
}
