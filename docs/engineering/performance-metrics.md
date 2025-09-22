# Performance Guardrails

We maintain a hard budget of **200 ms Interaction to Next Paint (INP)** for user-driven flows such as search, filtering, and drag/resize gestures.

## Automated Verification

The test suite `tests/performance-hooks.test.ts` enforces these thresholds by verifying that:

- Debounced callbacks used for search and filter inputs resolve within the 200 ms budget and clamp their delay between 150–250 ms.
- Throttled callbacks for resize/drag interactions deliver a response well below 200 ms while avoiding duplicate work.
- Cancelling a pending debounced operation prevents latent callbacks that could degrade INP.

Run the checks locally with:

```bash
pnpm test
```

## Latest Run

- `2025-09-22` – ✅ `pnpm test`
