"use server";

/**
 * Records the number of network requests issued by a server loader. The helper
 * logs a structured message and returns the recorded payload so tests can
 * assert against the budget. The budget is capped at two Supabase requests
 * based on our performance targets for high-traffic dashboard routes.
 */
export function recordNetworkBatch(page: string, requests: number) {
  const message = `[network] ${page} resolved with ${requests} supabase request${requests === 1 ? '' : 's'}`;

  if (requests > 2) {
    console.warn(`${message} (over budget)`);
  } else {
    console.info(message);
  }

  return { page, requests };
}
