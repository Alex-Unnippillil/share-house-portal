# Fetch Performance Playbook

## Coalescing in-flight work

We now expose `withCoalescing` in `@/lib/fetcher/with-coalescing` to prevent repeated
requests from stampeding downstream APIs. The helper caches the active promise for a
`resource` + `params` pair and hands the same promise back to every concurrent caller.
Once the promise settles it is removed from the cache so subsequent requests trigger
fresh network calls.

Use the helper for *idempotent* read paths that are susceptible to thundering herds:
Documenso reads, Cal.com lookups, Supabase loaders that power frequently rendered
layouts, etc. Avoid wrapping mutations or anything that must run every time a caller
invokes it.

## API

```ts
withCoalescing<TResult, TParams>(
  resource: string,
  params: TParams,
  loader: () => Promise<TResult>,
  options?: {
    logger?: (event: CoalescingLogEvent<TParams>) => void;
  }
): Promise<TResult>
```

- `resource`: A stable name for the upstream system + operation. Keep it human
  readable so metrics dashboards make sense.
- `params`: Serializable inputs that influence the upstream call. Use plain objects
  with primitive values so we can reliably derive a cache key.
- `loader`: The actual fetcher. It should return a promise and remain side-effect free
  beyond the network request.
- `options.logger`: Optional hook to emit custom telemetry. The default logger writes
  to `console.info` with hit/miss counts, hit rate and a hashed params fingerprint.

The module also exports:

- `getCoalescingMetrics(resource?: string)` – snapshot of hit/miss counters for all
  resources or a specific resource. Handy when piping counts into unit tests or
  dashboards.
- `resetCoalescingState()` – clears the in-flight cache and metrics. Useful in tests
  or when hot reloading modules in development.

## Example

```ts
const document = await withCoalescing(
  'documenso:getDocument',
  { documentId },
  () => fetchDocumensoDocument(documentId)
);
```

The helper ensures that multiple concurrent requests for the same document reuse the
same promise, drastically cutting Documenso traffic when pages render on the server.

## Observability

`withCoalescing` automatically logs hit/miss events through the default logger so we can
watch hit rates inside the Vercel or Datadog log streams. Custom loggers can push the
`CoalescingLogEvent` payload into StatsD, OpenTelemetry, or any other aggregation layer.
When building those integrations prefer recording the `paramsFingerprint` instead of raw
params to avoid logging PII.

Review logs after shipping new fetchers. Low hit rates usually mean either the params
object is unstable between calls or the fetcher is not receiving the coalescing helper.

## Best practices

- Wrap only deterministic fetches. If a call performs writes, queueing or other
  side-effects it should not be coalesced.
- Pass the minimal set of parameters required to uniquely identify the upstream
  request. Extra data reduces the likelihood of hits.
- Normalize parameter ordering before calling the helper (e.g. sort filter arrays) so
  equivalent requests share the same cache key.
- Reset the state between tests to avoid cross-test bleed.
- Keep an eye on the default logs in lower environments; they are intentionally noisy to
  make it obvious when coalescing is working.
