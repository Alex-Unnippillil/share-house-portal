export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface HttpRequestConfig {
  path: string;
  method?: HttpMethod;
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  parseJson?: boolean;
}

export interface HttpResponse<T = unknown> {
  status: number;
  ok: boolean;
  data: T;
  headers: Record<string, string>;
}

export interface HttpError<T = unknown> extends Error {
  status: number;
  response?: HttpResponse<T>;
}

export type RequestInterceptor = (
  config: RequestInit & { url: string }
) => Promise<RequestInit & { url: string }> | (RequestInit & { url: string });

export type ResponseInterceptor<T = unknown> = (
  response: HttpResponse<T>,
) => Promise<HttpResponse<T>> | HttpResponse<T>;

export interface HttpClientOptions {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  requestInterceptors?: RequestInterceptor[];
  responseInterceptors?: ResponseInterceptor[];
  onError?: (error: HttpError) => void;
  token?: string | null;
}

export interface HttpClient {
  request: <T = unknown>(config: HttpRequestConfig) => Promise<HttpResponse<T>>;
  get: <T = unknown>(path: string, config?: Omit<HttpRequestConfig, "path" | "method">) => Promise<HttpResponse<T>>;
  post: <T = unknown>(
    path: string,
    body?: unknown,
    config?: Omit<HttpRequestConfig, "path" | "method" | "body">
  ) => Promise<HttpResponse<T>>;
  put: <T = unknown>(
    path: string,
    body?: unknown,
    config?: Omit<HttpRequestConfig, "path" | "method" | "body">
  ) => Promise<HttpResponse<T>>;
  patch: <T = unknown>(
    path: string,
    body?: unknown,
    config?: Omit<HttpRequestConfig, "path" | "method" | "body">
  ) => Promise<HttpResponse<T>>;
  delete: <T = unknown>(path: string, config?: Omit<HttpRequestConfig, "path" | "method">) => Promise<HttpResponse<T>>;
  setToken: (token: string | null) => void;
}

const serializeQuery = (query: HttpRequestConfig["query"]): string => {
  if (!query) {
    return "";
  }

  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    params.append(key, String(value));
  });

  const search = params.toString();
  return search ? `?${search}` : "";
};

const toHeaders = (headers: Headers): Record<string, string> => {
  const entries: Record<string, string> = {};
  headers.forEach((value, key) => {
    entries[key] = value;
  });
  return entries;
};

const applyRequestInterceptors = async (
  config: RequestInit & { url: string },
  interceptors: RequestInterceptor[] = [],
) => {
  let nextConfig = config;
  for (const interceptor of interceptors) {
    nextConfig = await interceptor(nextConfig);
  }
  return nextConfig;
};

const applyResponseInterceptors = async <T>(
  response: HttpResponse<T>,
  interceptors: ResponseInterceptor<T>[] = [],
) => {
  let nextResponse = response;
  for (const interceptor of interceptors) {
    nextResponse = await interceptor(nextResponse);
  }
  return nextResponse;
};

const createHttpError = <T>(message: string, response?: HttpResponse<T>): HttpError<T> => {
  const error = new Error(message) as HttpError<T>;
  error.status = response?.status ?? 0;
  error.response = response;
  return error;
};

const shouldSerializeBody = (body: unknown) =>
  body !== undefined && !(body instanceof FormData) && typeof body !== "string";

export const createHttpClient = (options: HttpClientOptions): HttpClient => {
  let token: string | null = options.token ?? null;

  const setToken = (nextToken: string | null) => {
    token = nextToken;
  };

  const request: HttpClient["request"] = async <T = unknown>({
    path,
    method = "GET",
    headers,
    query,
    body,
    parseJson = true,
  }: HttpRequestConfig) => {
    const url = `${options.baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}${serializeQuery(query)}`;

    const requestInit: RequestInit & { url: string } = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...options.defaultHeaders,
        ...headers,
      },
      body: shouldSerializeBody(body) ? JSON.stringify(body) : (body as BodyInit | undefined),
      url,
    };

    if (token) {
      requestInit.headers = {
        ...requestInit.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    const interceptedConfig = await applyRequestInterceptors(requestInit, options.requestInterceptors);

    const response = await fetch(interceptedConfig.url, interceptedConfig);
    const headersMap = toHeaders(response.headers);

    let data: unknown = undefined;
    if (parseJson) {
      try {
        data = await response.json();
      } catch (error) {
        data = undefined;
      }
    } else {
      data = await response.text();
    }

    const normalizedResponse: HttpResponse<T> = {
      status: response.status,
      ok: response.ok,
      data: data as T,
      headers: headersMap,
    };

    const finalResponse = await applyResponseInterceptors(
      normalizedResponse,
      options.responseInterceptors as ResponseInterceptor<T>[] | undefined,
    );

    if (!finalResponse.ok) {
      const error = createHttpError("Request failed", finalResponse);
      options.onError?.(error);
      throw error;
    }

    return finalResponse;
  };

  const buildShortcut = (method: HttpMethod) =>
    async <T>(path: string, bodyOrConfig?: unknown, maybeConfig?: unknown) => {
      if (method === "GET" || method === "DELETE") {
        return request<T>({
          path,
          method,
          ...(bodyOrConfig as Omit<HttpRequestConfig, "path" | "method"> | undefined),
        });
      }

      return request<T>({
        path,
        method,
        body: bodyOrConfig,
        ...(maybeConfig as Omit<HttpRequestConfig, "path" | "method" | "body"> | undefined),
      });
    };

  return {
    request,
    get: buildShortcut("GET"),
    post: buildShortcut("POST"),
    put: buildShortcut("PUT"),
    patch: buildShortcut("PATCH"),
    delete: buildShortcut("DELETE"),
    setToken,
  };
};
