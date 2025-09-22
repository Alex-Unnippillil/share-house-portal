"use client"

import {
  type QueryFunctionContext,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { QUERY_DEDUPING_INTERVAL } from "@/lib/react-query"

const lastFetchAt = new Map<string, number>()

function hashKey(key: QueryKey) {
  try {
    return JSON.stringify(key)
  } catch (error) {
    return String(key)
  }
}

export type SupabaseQueryOptions<TQueryFnData, TError, TData> = Omit<
  UseQueryOptions<TQueryFnData, TError, TData, QueryKey>,
  "queryKey" | "queryFn"
> & {
  queryKey: QueryKey
  queryFn: (context: QueryFunctionContext<QueryKey>) => Promise<TQueryFnData>
  dedupingInterval?: number
}

export function useSupabaseQuery<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData
>(
  options: SupabaseQueryOptions<TQueryFnData, TError, TData>
): UseQueryResult<TData, TError> {
  const queryClient = useQueryClient()
  const {
    queryKey,
    queryFn,
    dedupingInterval = QUERY_DEDUPING_INTERVAL,
    ...rest
  } = options

  return useQuery({
    ...rest,
    queryKey,
    queryFn: async (context) => {
      const key = hashKey(context.queryKey)
      const now = Date.now()
      const lastFetched = lastFetchAt.get(key)

      if (
        typeof dedupingInterval === "number" &&
        dedupingInterval > 0 &&
        lastFetched &&
        now - lastFetched < dedupingInterval
      ) {
        const cached = queryClient.getQueryData<TQueryFnData>(context.queryKey)
        if (cached !== undefined) {
          return cached as TQueryFnData
        }
      }

      const result = await queryFn(context)
      lastFetchAt.set(key, Date.now())
      return result
    },
  })
}
