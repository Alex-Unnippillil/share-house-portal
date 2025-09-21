export interface SecureStorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  deleteItem: (key: string) => Promise<void>;
}

export interface SecureStorageOptions {
  keyPrefix?: string;
  serialize?: (value: unknown) => string;
  deserialize?: <T>(raw: string) => T;
  encrypt?: (value: string) => Promise<string> | string;
  decrypt?: (value: string) => Promise<string> | string;
}

export interface SetTokenOptions {
  expiresInSeconds?: number;
}

export interface TokenEvent<TValue = unknown> {
  type: "set" | "delete";
  key: string;
  value?: TValue;
  expiresAt?: number;
}

export type TokenListener<TValue = unknown> = (event: TokenEvent<TValue>) => void;

export interface SecureTokenStorage<TValue = unknown> {
  setToken: (key: string, value: TValue, options?: SetTokenOptions) => Promise<void>;
  getToken: <T = TValue>(key: string) => Promise<T | null>;
  removeToken: (key: string) => Promise<void>;
  hasValidToken: (key: string) => Promise<boolean>;
  clear: () => Promise<void>;
  subscribe: (listener: TokenListener<TValue>) => () => void;
}

interface StoredToken<TValue> {
  value: TValue;
  expiresAt?: number;
}

const defaultSerialize = (value: unknown) => JSON.stringify(value);
const defaultDeserialize = <T,>(raw: string) => JSON.parse(raw) as T;

const maybeEncrypt = async (value: string, encrypt?: SecureStorageOptions["encrypt"]) => {
  if (!encrypt) {
    return value;
  }
  return encrypt(value);
};

const maybeDecrypt = async (value: string, decrypt?: SecureStorageOptions["decrypt"]) => {
  if (!decrypt) {
    return value;
  }
  return decrypt(value);
};

const isExpired = (expiresAt?: number) => (expiresAt ? Date.now() > expiresAt : false);

export const createSecureTokenStorage = <TValue = unknown>(
  adapter: SecureStorageAdapter,
  options: SecureStorageOptions = {},
): SecureTokenStorage<TValue> => {
  const prefix = options.keyPrefix ?? "token";
  const serialize = options.serialize ?? defaultSerialize;
  const deserialize = options.deserialize ?? defaultDeserialize;
  const listeners = new Set<TokenListener<TValue>>();
  const managedKeys = new Set<string>();

  const withPrefix = (key: string) => `${prefix}:${key}`;

  const notify = (event: TokenEvent<TValue>) => {
    listeners.forEach((listener) => listener(event));
  };

  const setToken: SecureTokenStorage<TValue>["setToken"] = async (key, value, setOptions) => {
    const expiresAt = setOptions?.expiresInSeconds
      ? Date.now() + setOptions.expiresInSeconds * 1000
      : undefined;

    const payload: StoredToken<TValue> = {
      value,
      expiresAt,
    };

    const serialized = serialize(payload);
    const encrypted = await maybeEncrypt(serialized, options.encrypt);
    await adapter.setItem(withPrefix(key), encrypted);
    managedKeys.add(key);
    notify({ type: "set", key, value, expiresAt });
  };

  const getToken: SecureTokenStorage<TValue>["getToken"] = async <T = TValue>(key: string) => {
    const stored = await adapter.getItem(withPrefix(key));
    if (!stored) {
      return null;
    }

    const decrypted = await maybeDecrypt(stored, options.decrypt);
    try {
      const payload = deserialize<StoredToken<TValue>>(decrypted);
      if (isExpired(payload.expiresAt)) {
        await adapter.deleteItem(withPrefix(key));
        managedKeys.delete(key);
        notify({ type: "delete", key });
        return null;
      }

      managedKeys.add(key);
      return payload.value as unknown as T;
    } catch (error) {
      await adapter.deleteItem(withPrefix(key));
      managedKeys.delete(key);
      notify({ type: "delete", key });
      return null;
    }
  };

  const removeToken: SecureTokenStorage<TValue>["removeToken"] = async (key) => {
    await adapter.deleteItem(withPrefix(key));
    managedKeys.delete(key);
    notify({ type: "delete", key });
  };

  const hasValidToken: SecureTokenStorage<TValue>["hasValidToken"] = async (key) => {
    const value = await getToken(key);
    return value !== null && value !== undefined;
  };

  const clear: SecureTokenStorage<TValue>["clear"] = async () => {
    const keys = Array.from(managedKeys);
    await Promise.all(keys.map((key) => adapter.deleteItem(withPrefix(key))));
    managedKeys.clear();
    notify({ type: "delete", key: "*" });
  };

  const subscribe: SecureTokenStorage<TValue>["subscribe"] = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return {
    setToken,
    getToken,
    removeToken,
    hasValidToken,
    clear,
    subscribe,
  };
};

export const createMemorySecureStorageAdapter = (): SecureStorageAdapter => {
  const store = new Map<string, string>();
  return {
    getItem: async (key) => store.get(key) ?? null,
    setItem: async (key, value) => {
      store.set(key, value);
    },
    deleteItem: async (key) => {
      store.delete(key);
    },
  };
};
