# Optimistic UI Patterns

Optimistic updates keep the interface responsive even when we're waiting on Supabase writes. Two common flows now use the pattern:

- Todo toggles (`useTodos`)
- Notification actions (`NotificationCenter`)

The following guidelines cover how to adopt the same approach elsewhere.

## Core Loop

1. **Snapshot current state** – grab the query cache or component state before mutating it.
2. **Apply the optimistic change** – immediately update the UI so it reflects the desired end state.
3. **Execute the mutation** – call Supabase (or any async mutation) with the intended change.
4. **Handle results**
   - On success, reconcile with the server response (in case of extra fields like `updated_at`).
   - On failure, roll back to the saved snapshot and surface an error toast.
5. **Invalidate queries** (React Query) to let background refetches keep the cache fresh.

## React Query Example – Toggling Todos

`hooks/use-todos.ts` uses `useMutation` with `onMutate`, `onError`, `onSuccess`, and `onSettled`:

```ts
const toggleMutation = useMutation({
  mutationFn: async ({ id, completed }) => {
    const { data } = await supabase
      .from("todos")
      .update({ completed })
      .eq("id", id)
      .select("*")
      .single()
    return data
  },
  onMutate: async ({ id, completed }) => {
    await queryClient.cancelQueries({ queryKey: ["todos"] })
    const previous = queryClient.getQueryData<Todo[]>(["todos"])
    queryClient.setQueryData(["todos"], (old) =>
      old?.map((todo) =>
        todo.id === id ? { ...todo, completed } : todo,
      ),
    )
    return { previous }
  },
  onError: (_err, _vars, context) => {
    queryClient.setQueryData(["todos"], context?.previous)
    toast({ variant: "destructive", title: "Unable to update todo" })
  },
  onSuccess: (updatedTodo) => {
    queryClient.setQueryData(["todos"], (old) =>
      old?.map((todo) =>
        todo.id === updatedTodo.id ? updatedTodo : todo,
      ),
    )
    toast({ title: updatedTodo.completed ? "Todo completed" : "Todo reopened" })
  },
  onSettled: () => queryClient.invalidateQueries({ queryKey: ["todos"] }),
})
```

Key takeaways:

- Always cancel in-flight queries before mutating the cache.
- Return the snapshot from `onMutate` so you can restore it in `onError`.
- Use the Supabase response to reconcile the cache in `onSuccess`.
- Fire a toast for both success and failure so tenants know what happened.

## Local State Example – Notifications

`components/notifications/notification-center.tsx` relies on local state because it also handles realtime inserts. The same principles apply:

```ts
const previousNotifications = notifications.map((n) => ({ ...n }))
const previousUnread = unreadCount

setNotifications((prev) =>
  prev.map((notification) =>
    notification.id === notificationId
      ? { ...notification, read: true }
      : notification,
  ),
)
setUnreadCount((prev) => Math.max(0, prev - 1))

try {
  const { data } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .select("*")
    .single()

  setNotifications((prev) =>
    prev.map((notification) =>
      notification.id === notificationId ? normalise(data) : notification,
    ),
  )
  toast({ title: "Notification read" })
} catch (error) {
  setNotifications(previousNotifications)
  setUnreadCount(previousUnread)
  toast({ variant: "destructive", title: "Failed to mark notification as read" })
}
```

### Normalising Data

Supabase can return `null` for booleans like `read`. Always normalise to a plain boolean before writing to state so optimistic updates behave predictably.

### Toasts Are Required

Every optimistic path now fires a toast on success and failure. Use them to communicate what changed and how to recover if something goes wrong.

## When to Use Optimistic Updates

- Mutations that toggle booleans or update small payloads (e.g., mark-as-read, favourite/like toggles).
- Actions where conflicts are rare and the failure path can be handled with a simple rollback.
- Interfaces that benefit from instant feedback, especially when we expect repeated quick interactions.

Avoid optimistic updates for destructive actions that can't be undone or when you need authoritative conflict resolution (e.g., multi-step workflows, payments).

## Checklist

- [ ] Snapshot previous state.
- [ ] Apply the optimistic update.
- [ ] Perform the mutation.
- [ ] Roll back on error and toast the failure.
- [ ] Reconcile the cache/state on success.
- [ ] Invalidate the query (if using React Query) so background refetches keep things honest.

Follow this template and we maintain the snappy UX without sacrificing correctness.
