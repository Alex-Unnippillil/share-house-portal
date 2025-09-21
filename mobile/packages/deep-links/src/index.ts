export interface ParsedDeepLink {
  scheme: string;
  host: string;
  path: string;
  params: Record<string, string>;
  fragment?: string;
  raw: string;
}

export interface DeepLinkPattern {
  scheme?: string;
  host?: string;
  path?: string;
  exact?: boolean;
}

export type DeepLinkHandler = (link: ParsedDeepLink) => void | Promise<void>;

export interface DeepLinkManagerOptions {
  defaultScheme?: string;
  defaultHost?: string;
  onUnhandledLink?: (link: ParsedDeepLink) => void;
}

export interface BuildUrlOptions {
  scheme?: string;
  host?: string;
  params?: Record<string, string | number | boolean | undefined>;
}

export interface DeepLinkManager {
  register: (pattern: DeepLinkPattern, handler: DeepLinkHandler) => () => void;
  handle: (url: string) => Promise<boolean>;
  buildUrl: (path: string, options?: BuildUrlOptions) => string;
  subscribe: (listener: (link: ParsedDeepLink) => void) => () => void;
}

const normalizePath = (path: string) => path.replace(/^\//, "");

export const parseDeepLink = (url: string): ParsedDeepLink => {
  const trimmed = url.trim();
  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed);
  const normalized = hasScheme ? trimmed : `https://${trimmed}`;
  const parsed = new URL(normalized);
  const params: Record<string, string> = {};
  parsed.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return {
    scheme: parsed.protocol.replace(/:$/, ""),
    host: parsed.host,
    path: normalizePath(parsed.pathname),
    fragment: parsed.hash ? parsed.hash.replace(/^#/, "") : undefined,
    params,
    raw: url,
  };
};

const matchesPattern = (pattern: DeepLinkPattern, link: ParsedDeepLink) => {
  if (pattern.scheme && pattern.scheme !== link.scheme) {
    return false;
  }

  if (pattern.host && pattern.host !== link.host) {
    return false;
  }

  if (!pattern.path) {
    return true;
  }

  const expectedPath = normalizePath(pattern.path);
  const actualPath = normalizePath(link.path);

  if (pattern.exact) {
    return expectedPath === actualPath;
  }

  return actualPath.startsWith(expectedPath);
};

const buildQuery = (params?: BuildUrlOptions["params"]) => {
  if (!params) {
    return "";
  }

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    searchParams.append(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
};

export const createDeepLinkManager = (options: DeepLinkManagerOptions = {}): DeepLinkManager => {
  const handlers: Array<{ pattern: DeepLinkPattern; handler: DeepLinkHandler }> = [];
  const listeners = new Set<(link: ParsedDeepLink) => void>();

  const register: DeepLinkManager["register"] = (pattern, handler) => {
    const entry = { pattern, handler };
    handlers.push(entry);
    return () => {
      const index = handlers.indexOf(entry);
      if (index >= 0) {
        handlers.splice(index, 1);
      }
    };
  };

  const handle: DeepLinkManager["handle"] = async (url) => {
    const link = parseDeepLink(url);
    listeners.forEach((listener) => listener(link));

    let handled = false;
    for (const { pattern, handler } of handlers) {
      if (matchesPattern(pattern, link)) {
        handled = true;
        await handler(link);
      }
    }

    if (!handled) {
      options.onUnhandledLink?.(link);
    }

    return handled;
  };

  const buildUrl: DeepLinkManager["buildUrl"] = (path, buildOptions = {}) => {
    const scheme = buildOptions.scheme ?? options.defaultScheme ?? "app";
    const host = buildOptions.host ?? options.defaultHost ?? "";
    const normalizedPath = normalizePath(path);
    const query = buildQuery(buildOptions.params);
    const authority = host ? `${host}/` : "";
    return `${scheme}://${authority}${normalizedPath}${query}`;
  };

  const subscribe: DeepLinkManager["subscribe"] = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return {
    register,
    handle,
    buildUrl,
    subscribe,
  };
};
