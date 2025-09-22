# Optimistic UI Pattern

This project uses [TanStack Query](https://tanstack.com/query/latest) to keep frequently changing Supabase data in sync with the UI. When we fire a mutation we optimistically update the cached query data so that users see the result of their action immediately, then rely on Supabase Realtime events (and a follow-up invalidation) to reconcile with the canonical server state.

## Core building blocks

1. **Stable query keys** – every screen that needs to be mutated is backed by a `useQuery` call. The key is reused inside the mutation so that we can update the same cache entry.
2. **Cancel and snapshot** – before applying an optimistic change we call `queryClient.cancelQueries` and capture the previous cached value. This lets us roll back if the mutation fails.
3. **`setQueryData` for optimistic updates** – mutate the cached list synchronously to mirror the expected server response. Because React Query re-renders subscribers synchronously, the UI stays snappy without waiting on network latency.
4. **Rollback on error** – the snapshot collected in `onMutate` is restored inside `onError`, and we surface a toast with a helpful failure message.
5. **Revalidation/Reconciliation** – in `onSettled` we invalidate the query so that Supabase becomes the source of truth again. At the same time, Supabase realtime subscriptions update the cache as soon as the database change is broadcast, so most of the time the cache is already correct when the invalidation happens.

## Notifications example

```ts
const markAsReadMutation = useMutation({
  mutationFn: async (id: string) => {
    const { error } = await supabase.from('notifications')
      .update({ read: true })
      .eq('id', id)
    if (error) throw error
  },
  onMutate: async (id) => {
    await queryClient.cancelQueries({ queryKey: NOTIFICATION_KEY })
    const snapshot = queryClient.getQueryData<Notification[]>(NOTIFICATION_KEY)
    queryClient.setQueryData(NOTIFICATION_KEY, current =>
      current?.map(n => n.id === id ? { ...n, read: true } : n) ?? []
    )
    return { snapshot }
  },
  onError: (_err, _id, context) => {
    queryClient.setQueryData(NOTIFICATION_KEY, context?.snapshot)
    toast({ title: 'Failed to mark notification as read', variant: 'destructive' })
  },
  onSettled: () => queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEY })
})
```

`notification-center.tsx` also listens to Supabase realtime `INSERT`, `UPDATE`, and `DELETE` events. When a confirmation event arrives, the handler normalises the payload and `setQueryData` merges the server state into the cache. This keeps optimistic state honest even when multiple tabs are open.

## Documents example

Both the **Sign Document** action and the **Create Signing Request** flow use the same pattern:

- `useQuery(['documents', filters])` fetches the visible list of documents.
- Mutations (`signDocumentMutation` and `createSigningRequestMutation`) optimistically update the relevant document inside *every* cached document query via `queryClient.getQueriesData` + `setQueryData`.
- Rollbacks restore the cached arrays if Supabase rejects the request, and success handlers raise toasts to give users feedback.
- `onSettled` invalidates the query key so that the cache converges with Supabase once the mutation is finished, while realtime broadcasts update the cache even sooner.

## When to use this pattern

Reach for this approach whenever a mutation should feel instantaneous and the data already lives in a React Query cache. The recipe is:

1. Ensure the view is powered by `useQuery` and choose a reusable key.
2. Inside the related mutation, snapshot the cache, optimistically apply the update with `setQueryData`, and return the snapshot for rollbacks.
3. Provide clear user feedback on failure (toast/snackbar) and invalidate the query when the mutation settles so that Supabase remains authoritative.

Following these steps keeps UI interactions responsive without giving up correctness.
