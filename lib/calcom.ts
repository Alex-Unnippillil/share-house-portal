interface BuildUrlOptions {
  baseUrl?: string;
}

const DEFAULT_CALCOM_API_BASE = "https://api.cal.com/v1";

function normaliseBaseUrl(baseUrl?: string): string {
  const value = baseUrl && baseUrl.length > 0 ? baseUrl : DEFAULT_CALCOM_API_BASE;
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function buildApiUrl(path: string, options?: BuildUrlOptions): string {
  const base = normaliseBaseUrl(options?.baseUrl ?? process.env.CALCOM_BASE_URL);
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export interface CalBookingResponse {
  id: string;
  startTime: string | null;
  endTime: string | null;
  status?: string | null;
  eventTypeId?: string;
}

export async function fetchCalBooking(eventId: string): Promise<CalBookingResponse | null> {
  const apiKey = process.env.CALCOM_API_KEY;

  if (!apiKey) {
    console.warn("CALCOM_API_KEY is not configured; unable to query Cal.com booking");
    return null;
  }

  const url = buildApiUrl(`/bookings/${encodeURIComponent(eventId)}`);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`Failed to fetch Cal.com booking (${response.status}): ${errorText}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const id = typeof payload.uid === "string" && payload.uid.length > 0 ? payload.uid : payload.id;

  return {
    id: String(id ?? eventId),
    startTime: typeof payload.startTime === "string" ? payload.startTime : (typeof payload.start_time === "string" ? payload.start_time : null),
    endTime: typeof payload.endTime === "string" ? payload.endTime : (typeof payload.end_time === "string" ? payload.end_time : null),
    status: typeof payload.status === "string" ? payload.status : null,
    eventTypeId:
      typeof payload.eventTypeId === "string"
        ? payload.eventTypeId
        : typeof payload.eventTypeId === "number"
          ? String(payload.eventTypeId)
          : typeof payload.event_type_id === "number"
            ? String(payload.event_type_id)
            : typeof payload.event_type_id === "string"
              ? payload.event_type_id
              : undefined,
  };
}

export function resolveCalEmbedLink({
  host,
  eventSlug,
  origin,
}: {
  host: string;
  eventSlug: string;
  origin?: string;
}): string {
  const cleanedOrigin = origin && origin.length > 0 ? origin : "https://cal.com";
  const formattedOrigin = cleanedOrigin.endsWith("/") ? cleanedOrigin.slice(0, -1) : cleanedOrigin;
  const cleanedHost = host.replace(/^\//, "").replace(/\/$/, "");
  const cleanedSlug = eventSlug.replace(/^\//, "");
  return `${formattedOrigin}/${cleanedHost}/${cleanedSlug}`;
}

export { buildApiUrl };
